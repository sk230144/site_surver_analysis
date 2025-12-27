"""
Quick test script for electrical analysis logic
"""
from app.services.electrical import run_electrical_analysis
import json

# Test Case 1: Safe installation - good capacity
print("=" * 80)
print("TEST 1: Safe Installation (9.6kW on 200A panel)")
print("=" * 80)

test_data_1 = {
    "system_size_kw": "9.6",
    "main_panel_rating_a": "200",
    "main_breaker_rating_a": "200",
    "phase_type": "single",
    "panel_age": "under_10_years",
    "voltage": "230",
    "panel_condition": "good",
    "wiring_condition": "good"
}

result_1 = run_electrical_analysis(test_data_1)
print(f"\nStatus: {result_1['status']}")
print(f"Score: {result_1['score']}/100")
print(f"Summary: {result_1['summary']}")
print(f"\nCalculations:")
for key, value in result_1['calculations'].items():
    print(f"  {key}: {value}")

print(f"\nChecks:")
for check in result_1['checks']:
    print(f"  [{check['status'].upper()}] {check['name']}: {check['message']}")

print(f"\nRecommendations:")
for rec in result_1['recommendations']:
    print(f"  Priority: {rec['priority'].upper()}")
    print(f"  {rec['action']}")
    print(f"  {rec['reason']}")
    print(f"  {rec['next_step']}\n")

# Test Case 2: Panel capacity exceeded
print("\n" + "=" * 80)
print("TEST 2: FAIL - Panel Capacity Exceeded (15kW on 100A panel)")
print("=" * 80)

test_data_2 = {
    "system_size_kw": "15",
    "main_panel_rating_a": "100",
    "main_breaker_rating_a": "100",
    "phase_type": "single",
    "panel_age": "10_20_years",
    "voltage": "230",
    "panel_condition": "good",
    "wiring_condition": "good"
}

result_2 = run_electrical_analysis(test_data_2)
print(f"\nStatus: {result_2['status']}")
print(f"Score: {result_2['score']}/100")
print(f"Summary: {result_2['summary']}")
print(f"\nCalculations:")
for key, value in result_2['calculations'].items():
    print(f"  {key}: {value}")

print(f"\nChecks:")
for check in result_2['checks']:
    print(f"  [{check['status'].upper()}] {check['name']}: {check['message']}")

print(f"\nRecommendations:")
for rec in result_2['recommendations']:
    print(f"  Priority: {rec['priority'].upper()}")
    print(f"  {rec['action']}")
    print(f"  {rec['reason']}")
    print(f"  {rec['next_step']}\n")

# Test Case 3: Warning - tight capacity + old panel
print("\n" + "=" * 80)
print("TEST 3: WARNING - Tight Capacity + Old Panel (9.6kW on 125A panel, 25 years old)")
print("=" * 80)

test_data_3 = {
    "system_size_kw": "9.6",
    "main_panel_rating_a": "125",
    "main_breaker_rating_a": "100",
    "phase_type": "single",
    "panel_age": "20_30_years",
    "voltage": "230",
    "panel_condition": "fair",
    "wiring_condition": "fair"
}

result_3 = run_electrical_analysis(test_data_3)
print(f"\nStatus: {result_3['status']}")
print(f"Score: {result_3['score']}/100")
print(f"Summary: {result_3['summary']}")
print(f"\nCalculations:")
for key, value in result_3['calculations'].items():
    print(f"  {key}: {value}")

print(f"\nChecks:")
for check in result_3['checks']:
    print(f"  [{check['status'].upper()}] {check['name']}: {check['message']}")

print(f"\nRecommendations:")
for rec in result_3['recommendations']:
    print(f"  Priority: {rec['priority'].upper()}")
    print(f"  {rec['action']}")
    print(f"  {rec['reason']}")
    print(f"  {rec['next_step']}\n")

print("\n" + "=" * 80)
print("All tests completed successfully!")
print("=" * 80)
