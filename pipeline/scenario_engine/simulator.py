from dataclasses import dataclass


@dataclass
class D1Inputs:
    iva: float
    bes: float
    vac: float


@dataclass
class D2Inputs:
    ioe: float
    ihe: float
    iea: float


@dataclass
class SimResult:
    d1_score: float
    d2_score: float
    d1_inputs: D1Inputs
    d2_inputs: D2Inputs


def simulate_kpis(d1: D1Inputs, d2: D2Inputs) -> SimResult:
    d1_score = round(d1.iva * 0.5 + d1.bes * 0.3 + d1.vac * 0.2, 4)
    d2_score = round(d2.ioe * 0.4 + d2.ihe * 0.35 + d2.iea * 0.25, 4)
    return SimResult(d1_score=d1_score, d2_score=d2_score, d1_inputs=d1, d2_inputs=d2)
