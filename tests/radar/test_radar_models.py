import pytest
from datetime import datetime, UTC, timedelta
from pipeline.db.models_radar import EventoIADespido, EventoIAEmpleo, SkillEmergente


def test_evento_despido_crea_con_campos_minimos(session):
    ev = EventoIADespido(
        empresa="Acme Corp",
        sector="tecnología",
        pais="US",
        fecha_anuncio=datetime.now(UTC).date(),
        fuente_url="https://reuters.com/test",
        fuente_nombre="Reuters",
        confiabilidad="media",
    )
    session.add(ev)
    session.flush()
    assert ev.id is not None
    assert ev.ahorro_anual_usd is None
    assert ev.revocado is False


def test_evento_despido_calcula_ahorro(session):
    ev = EventoIADespido(
        empresa="Banco MX",
        sector="finanzas",
        pais="MX",
        fecha_anuncio=datetime.now(UTC).date(),
        numero_despidos=500,
        salario_promedio_usd=24000.0,
        fuente_url="https://test.com/1",
        fuente_nombre="Test",
        confiabilidad="alta",
    )
    session.add(ev)
    session.flush()
    # 500 * 24000 * 12
    assert ev.ahorro_anual_usd == pytest.approx(144_000_000.0)


def test_skill_emergente_actualiza_menciones(session):
    sk = SkillEmergente(skill="Python", categoria="tecnica")
    session.add(sk)
    session.flush()
    assert sk.menciones_30d == 0
    sk.menciones_30d += 5
    session.flush()
    assert sk.menciones_30d == 5
