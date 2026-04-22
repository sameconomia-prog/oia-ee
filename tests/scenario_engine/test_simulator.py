# tests/scenario_engine/test_simulator.py
from pipeline.scenario_engine.simulator import D1Inputs, D2Inputs, simulate_kpis


def test_simulate_kpis_formula():
    d1 = D1Inputs(iva=0.75, bes=0.80, vac=0.60)
    d2 = D2Inputs(ioe=0.40, ihe=0.35, iea=0.45)
    result = simulate_kpis(d1, d2)
    # D1 = 0.75*0.5 + 0.80*0.3 + 0.60*0.2 = 0.735
    assert result.d1_score == 0.735
    # D2 = 0.40*0.4 + 0.35*0.35 + 0.45*0.25 = 0.395
    assert result.d2_score == 0.395
    assert result.d1_inputs is d1
    assert result.d2_inputs is d2


def test_simulate_kpis_extremos():
    zeros = simulate_kpis(D1Inputs(0.0, 0.0, 0.0), D2Inputs(0.0, 0.0, 0.0))
    assert zeros.d1_score == 0.0
    assert zeros.d2_score == 0.0

    ones = simulate_kpis(D1Inputs(1.0, 1.0, 1.0), D2Inputs(1.0, 1.0, 1.0))
    assert ones.d1_score == 1.0
    assert ones.d2_score == 1.0
