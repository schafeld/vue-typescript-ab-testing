#!/usr/bin/env python3
"""
A/B Testing Analytics Script

This Python script demonstrates:
1. SQLite database analysis for A/B testing results
2. Statistical significance testing
3. Data visualization with matplotlib/seaborn  
4. Conversion funnel analysis
5. Report generation for experiment results

Usage:
    python analyze_experiments.py --experiment homepage-hero-test
    python analyze_experiments.py --report --output results.html
    python analyze_experiments.py --funnel --experiment checkout-flow-test
"""

import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

class ABTestAnalyzer:
    """
    A/B Testing Analytics and Statistical Analysis
    
    This class provides comprehensive analysis capabilities for A/B testing results,
    including statistical significance testing, effect size calculation, and 
    visualization generation.
    """
    
    def __init__(self, db_path: str = '../shop-app/server/data/analytics.db'):
        """Initialize analyzer with database connection."""
        self.db_path = db_path
        self.conn = None
        self.connect_db()
        
    def connect_db(self):
        """Establish database connection."""
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row  # Enable dict-like access
            print(f"✅ Connected to database: {self.db_path}")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise
    
    def get_experiment_data(self, experiment_id: str) -> pd.DataFrame:
        """
        Retrieve experiment data with user assignments and conversion events.
        
        Args:
            experiment_id: ID of the experiment to analyze
            
        Returns:
            DataFrame with user assignments and conversion data
        """
        query = """
        SELECT 
            ua.user_id,
            ua.variant_id,
            ua.assigned_at,
            COUNT(CASE WHEN ae.event_type = 'purchase' THEN 1 END) as conversions,
            COUNT(CASE WHEN ae.event_type = 'add_to_cart' THEN 1 END) as add_to_carts,
            COUNT(CASE WHEN ae.event_type = 'page_view' THEN 1 END) as page_views,
            MAX(CASE WHEN ae.event_type = 'purchase' 
                THEN json_extract(ae.properties, '$.totalAmount') END) as revenue
        FROM user_assignments ua
        LEFT JOIN analytics_events ae ON ua.user_id = ae.user_id
        WHERE ua.experiment_id = ?
        GROUP BY ua.user_id, ua.variant_id
        """
        
        df = pd.read_sql_query(query, self.conn, params=(experiment_id,))
        df['converted'] = df['conversions'] > 0
        df['revenue'] = pd.to_numeric(df['revenue'], errors='coerce').fillna(0)
        
        return df
    
    def calculate_conversion_rates(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """
        Calculate conversion rates and confidence intervals for each variant.
        
        Args:
            df: DataFrame with experiment data
            
        Returns:
            Dictionary with conversion statistics by variant
        """
        results = {}
        
        for variant in df['variant_id'].unique():
            variant_data = df[df['variant_id'] == variant]
            n = len(variant_data)
            conversions = variant_data['converted'].sum()
            
            if n == 0:
                continue
                
            # Conversion rate calculation
            conversion_rate = conversions / n
            
            # Wilson score interval for confidence bounds
            z = 1.96  # 95% confidence
            p = conversion_rate
            
            denominator = 1 + (z**2 / n)
            centre_adjusted_probability = (p + (z**2 / (2 * n))) / denominator
            adjusted_standard_deviation = np.sqrt(((p * (1 - p)) + (z**2 / (4 * n))) / n) / denominator
            
            lower_bound = centre_adjusted_probability - (z * adjusted_standard_deviation)
            upper_bound = centre_adjusted_probability + (z * adjusted_standard_deviation)
            
            results[variant] = {
                'users': n,
                'conversions': int(conversions),
                'conversion_rate': conversion_rate,
                'ci_lower': max(0, lower_bound),
                'ci_upper': min(1, upper_bound),
                'revenue_total': variant_data['revenue'].sum(),
                'revenue_per_user': variant_data['revenue'].mean(),
                'add_to_cart_rate': variant_data['add_to_carts'].sum() / n if n > 0 else 0
            }
        
        return results
    
    def statistical_significance_test(self, df: pd.DataFrame, control_variant: str = 'control') -> Dict:
        """
        Perform statistical significance testing between variants.
        
        Args:
            df: DataFrame with experiment data
            control_variant: Name of the control variant
            
        Returns:
            Dictionary with statistical test results
        """
        results = {}
        control_data = df[df['variant_id'] == control_variant]
        
        if len(control_data) == 0:
            return {'error': 'Control variant not found'}
        
        control_conversions = control_data['converted'].sum()
        control_users = len(control_data)
        
        for variant in df['variant_id'].unique():
            if variant == control_variant:
                continue
                
            variant_data = df[df['variant_id'] == variant]
            variant_conversions = variant_data['converted'].sum()
            variant_users = len(variant_data)
            
            # Chi-square test for conversion rates
            contingency_table = np.array([
                [control_conversions, control_users - control_conversions],
                [variant_conversions, variant_users - variant_conversions]
            ])
            
            chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)
            
            # Effect size (Cramér's V)
            n = contingency_table.sum()
            cramers_v = np.sqrt(chi2 / (n * (min(contingency_table.shape) - 1)))
            
            # Relative lift calculation
            control_rate = control_conversions / control_users if control_users > 0 else 0
            variant_rate = variant_conversions / variant_users if variant_users > 0 else 0
            relative_lift = (variant_rate - control_rate) / control_rate * 100 if control_rate > 0 else 0
            
            results[f'{control_variant}_vs_{variant}'] = {
                'p_value': p_value,
                'chi_square': chi2,
                'significant': p_value < 0.05,
                'effect_size': cramers_v,
                'relative_lift_percent': relative_lift,
                'control_rate': control_rate,
                'variant_rate': variant_rate
            }
        
        return results
    
    def sample_size_analysis(self, baseline_rate: float, mde: float, alpha: float = 0.05, power: float = 0.8) -> int:
        """
        Calculate required sample size for statistical power.
        
        Args:
            baseline_rate: Expected baseline conversion rate
            mde: Minimum detectable effect (as proportion)
            alpha: Type I error rate (significance level)
            power: Statistical power (1 - Type II error rate)
            
        Returns:
            Required sample size per variant
        """
        # Z-scores for alpha and power
        z_alpha = stats.norm.ppf(1 - alpha/2)
        z_beta = stats.norm.ppf(power)
        
        # Effect size calculation
        p1 = baseline_rate
        p2 = baseline_rate * (1 + mde)
        
        # Pooled proportion
        p_pooled = (p1 + p2) / 2
        
        # Sample size formula for two proportions
        numerator = (z_alpha * np.sqrt(2 * p_pooled * (1 - p_pooled)) + 
                    z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
        denominator = (p2 - p1) ** 2
        
        sample_size = int(np.ceil(numerator / denominator))
        
        return sample_size
    
    def funnel_analysis(self, experiment_id: str) -> pd.DataFrame:
        """
        Analyze conversion funnel for the experiment.
        
        Args:
            experiment_id: ID of the experiment to analyze
            
        Returns:
            DataFrame with funnel step analysis by variant
        """
        query = """
        SELECT 
            ua.variant_id,
            ae.event_type,
            COUNT(DISTINCT ae.user_id) as unique_users,
            COUNT(*) as total_events
        FROM user_assignments ua
        JOIN analytics_events ae ON ua.user_id = ae.user_id
        WHERE ua.experiment_id = ?
        GROUP BY ua.variant_id, ae.event_type
        ORDER BY ua.variant_id, ae.event_type
        """
        
        return pd.read_sql_query(query, self.conn, params=(experiment_id,))
    
    def generate_visualizations(self, experiment_id: str, output_dir: str = 'reports'):
        """
        Generate comprehensive visualizations for experiment analysis.
        
        Args:
            experiment_id: ID of the experiment to visualize
            output_dir: Directory to save visualization files
        """
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Set up the plotting style
        plt.style.use('seaborn-v0_8-whitegrid')
        sns.set_palette("husl")
        
        # Get experiment data
        df = self.get_experiment_data(experiment_id)
        conversion_stats = self.calculate_conversion_rates(df)
        
        # 1. Conversion Rate Comparison
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
        
        variants = list(conversion_stats.keys())
        rates = [conversion_stats[v]['conversion_rate'] for v in variants]
        ci_lower = [conversion_stats[v]['ci_lower'] for v in variants]
        ci_upper = [conversion_stats[v]['ci_upper'] for v in variants]
        
        # Conversion rates with confidence intervals
        bars = ax1.bar(variants, rates, alpha=0.7, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'][:len(variants)])
        ax1.errorbar(variants, rates, 
                    yerr=[(np.array(rates) - np.array(ci_lower)), 
                          (np.array(ci_upper) - np.array(rates))], 
                    fmt='none', ecolor='black', capsize=5)
        ax1.set_title(f'Conversion Rates by Variant\\n{experiment_id}', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Conversion Rate')
        ax1.set_ylim(0, max(ci_upper) * 1.2)
        
        # Add value labels on bars
        for bar, rate in zip(bars, rates):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height + max(rates) * 0.01,
                    f'{rate:.2%}', ha='center', va='bottom')
        
        # 2. Sample size distribution
        users = [conversion_stats[v]['users'] for v in variants]
        ax2.bar(variants, users, alpha=0.7, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'][:len(variants)])
        ax2.set_title('Sample Size by Variant', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Number of Users')
        
        for i, (variant, user_count) in enumerate(zip(variants, users)):
            ax2.text(i, user_count + max(users) * 0.01, str(user_count), 
                    ha='center', va='bottom')
        
        # 3. Revenue analysis
        revenue_per_user = [conversion_stats[v]['revenue_per_user'] for v in variants]
        ax3.bar(variants, revenue_per_user, alpha=0.7, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'][:len(variants)])
        ax3.set_title('Revenue per User', fontsize=14, fontweight='bold')
        ax3.set_ylabel('Revenue (€)')
        
        # 4. Funnel analysis
        funnel_df = self.funnel_analysis(experiment_id)
        if not funnel_df.empty:
            pivot_funnel = funnel_df.pivot(index='event_type', columns='variant_id', values='unique_users')
            pivot_funnel.plot(kind='bar', ax=ax4, alpha=0.7)
            ax4.set_title('Conversion Funnel by Variant', fontsize=14, fontweight='bold')
            ax4.set_ylabel('Unique Users')
            ax4.legend(title='Variant')
            ax4.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/{experiment_id}_analysis.png', dpi=300, bbox_inches='tight')
        print(f"📊 Visualizations saved: {output_dir}/{experiment_id}_analysis.png")
        
        return fig
    
    def generate_report(self, experiment_id: str, output_file: str = None):
        """
        Generate comprehensive HTML report for experiment analysis.
        
        Args:
            experiment_id: ID of the experiment to report on
            output_file: Output filename for the report
        """
        if output_file is None:
            output_file = f'reports/{experiment_id}_report.html'
        
        # Get analysis data
        df = self.get_experiment_data(experiment_id)
        conversion_stats = self.calculate_conversion_rates(df)
        significance_tests = self.statistical_significance_test(df)
        
        # Generate HTML report
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>A/B Test Report: {experiment_id}</title>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
                .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 40px; border-bottom: 2px solid #007acc; padding-bottom: 20px; }}
                .metric-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }}
                .metric-card {{ background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; text-align: center; }}
                .metric-value {{ font-size: 2em; font-weight: bold; color: #007acc; }}
                .metric-label {{ color: #666; margin-top: 5px; }}
                .significance {{ background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }}
                .not-significant {{ background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background-color: #007acc; color: white; }}
                .highlight {{ background-color: #fff3cd; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>A/B Test Analysis Report</h1>
                    <h2>{experiment_id}</h2>
                    <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <h2>📊 Summary Statistics</h2>
                <div class="metric-grid">
        """
        
        # Add variant statistics
        for variant, stats in conversion_stats.items():
            html_content += f"""
                    <div class="metric-card">
                        <div class="metric-value">{stats['conversion_rate']:.2%}</div>
                        <div class="metric-label">{variant} Conversion Rate</div>
                        <small>{stats['conversions']} / {stats['users']} users</small>
                    </div>
            """
        
        html_content += """
                </div>
                
                <h2>🔬 Statistical Significance Tests</h2>
                <table>
                    <tr>
                        <th>Comparison</th>
                        <th>P-Value</th>
                        <th>Significant?</th>
                        <th>Relative Lift</th>
                        <th>Effect Size</th>
                    </tr>
        """
        
        # Add significance test results
        for comparison, test_result in significance_tests.items():
            significance_class = 'significance' if test_result['significant'] else 'not-significant'
            html_content += f"""
                    <tr class="{significance_class}">
                        <td>{comparison}</td>
                        <td>{test_result['p_value']:.4f}</td>
                        <td>{'✅ Yes' if test_result['significant'] else '❌ No'}</td>
                        <td>{test_result['relative_lift_percent']:.1f}%</td>
                        <td>{test_result['effect_size']:.3f}</td>
                    </tr>
            """
        
        html_content += f"""
                </table>
                
                <h2>📈 Recommendations</h2>
                <div style="background: #e7f3ff; border-left: 4px solid #007acc; padding: 20px; margin: 20px 0;">
        """
        
        # Generate recommendations based on results
        if significance_tests:
            best_variant = max(conversion_stats.items(), key=lambda x: x[1]['conversion_rate'])
            html_content += f"""
                    <h3>Key Findings:</h3>
                    <ul>
                        <li><strong>Best Performing Variant:</strong> {best_variant[0]} with {best_variant[1]['conversion_rate']:.2%} conversion rate</li>
                        <li><strong>Sample Size:</strong> Total of {df['user_id'].nunique()} users across all variants</li>
                        <li><strong>Statistical Power:</strong> {'Sufficient' if df['user_id'].nunique() > 1000 else 'May need more data'}</li>
                    </ul>
            """
        
        html_content += """
                </div>
                
                <footer style="margin-top: 40px; text-align: center; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
                    <p>Generated by AB Testing Analytics Suite | Vue 3 + TypeScript Demo Project</p>
                </footer>
            </div>
        </body>
        </html>
        """
        
        # Save report
        import os
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else 'reports', exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"📄 Report generated: {output_file}")
        return output_file

def main():
    """Main CLI interface for the analytics script."""
    parser = argparse.ArgumentParser(description='A/B Testing Analytics Tool')
    parser.add_argument('--experiment', '-e', help='Experiment ID to analyze')
    parser.add_argument('--report', '-r', action='store_true', help='Generate HTML report')
    parser.add_argument('--visualize', '-v', action='store_true', help='Generate visualizations')
    parser.add_argument('--funnel', '-f', action='store_true', help='Perform funnel analysis')
    parser.add_argument('--output', '-o', help='Output file/directory')
    parser.add_argument('--db', help='Database path', default='../shop-app/server/data/analytics.db')
    
    args = parser.parse_args()
    
    # Initialize analyzer
    try:
        analyzer = ABTestAnalyzer(args.db)
    except Exception as e:
        print(f"❌ Failed to initialize analyzer: {e}")
        return 1
    
    if not args.experiment:
        print("❌ Please specify an experiment ID with --experiment")
        return 1
    
    try:
        # Basic analysis
        print(f"🔍 Analyzing experiment: {args.experiment}")
        df = analyzer.get_experiment_data(args.experiment)
        
        if df.empty:
            print(f"⚠️  No data found for experiment: {args.experiment}")
            return 1
        
        # Print basic statistics
        conversion_stats = analyzer.calculate_conversion_rates(df)
        print("\\n📊 Conversion Rate Summary:")
        print("-" * 50)
        
        for variant, stats in conversion_stats.items():
            print(f"{variant:15} | {stats['conversion_rate']:6.2%} | {stats['conversions']:4d}/{stats['users']:4d} users")
        
        # Statistical significance testing
        significance_tests = analyzer.statistical_significance_test(df)
        if significance_tests:
            print("\\n🔬 Statistical Significance:")
            print("-" * 50)
            for comparison, result in significance_tests.items():
                significance = "✅ Significant" if result['significant'] else "❌ Not Significant"
                print(f"{comparison:20} | p={result['p_value']:.4f} | {significance} | Lift: {result['relative_lift_percent']:+.1f}%")
        
        # Generate report if requested
        if args.report:
            output_file = args.output or f"reports/{args.experiment}_report.html"
            analyzer.generate_report(args.experiment, output_file)
        
        # Generate visualizations if requested
        if args.visualize:
            output_dir = args.output or "reports"
            analyzer.generate_visualizations(args.experiment, output_dir)
        
        # Funnel analysis if requested
        if args.funnel:
            print("\\n🔄 Funnel Analysis:")
            print("-" * 50)
            funnel_df = analyzer.funnel_analysis(args.experiment)
            print(funnel_df.to_string(index=False))
        
        print("\\n✅ Analysis complete!")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return 1
    
    finally:
        analyzer.conn.close()
    
    return 0

if __name__ == '__main__':
    exit(main())