"""
Seed demo para OIA-EE — puebla la BD con datos realistas para MVP.
Uso:
    cd ~/Documents/OIA-EE && source pipeline/.venv/bin/activate
    python -m pipeline.seed_demo
"""
import json
import logging
from dataclasses import dataclass
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from pipeline.db import get_session
from pipeline.db.models import IES, Carrera, CarreraIES, Ocupacion, Noticia, Vacante
from pipeline.jobs.anuies_ingest_job import ingest_anuies, _normalizar_nombre
from pipeline.loaders.anuies_loader import AnuiesRecord
from pipeline.loaders.stps_loader import StpsVacante
from pipeline.jobs.stps_ingest_job import ingest_stps

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# ── Datos IES ──────────────────────────────────────────────────────────────────
ANUIES_DEMO: list[AnuiesRecord] = [
    AnuiesRecord("001001","UNAM","pública","federal","Ciudad de México",350000,"Ingeniería en Computación","Ingeniería","licenciatura",2400,480,"2024/2"),
    AnuiesRecord("001001","UNAM","pública","federal","Ciudad de México",350000,"Administración de Empresas","Ciencias Sociales","licenciatura",3200,640,"2024/2"),
    AnuiesRecord("001001","UNAM","pública","federal","Ciudad de México",350000,"Economía","Ciencias Sociales","licenciatura",1800,360,"2024/2"),
    AnuiesRecord("002001","TEC de Monterrey","privada","privada","Nuevo León",50000,"Ingeniería en Sistemas Computacionales","Ingeniería","licenciatura",1200,300,"2024/2"),
    AnuiesRecord("002001","TEC de Monterrey","privada","privada","Nuevo León",50000,"Ciencia de Datos","Ingeniería","licenciatura",800,200,"2024/2"),
    AnuiesRecord("002001","TEC de Monterrey","privada","privada","Nuevo León",50000,"Ingeniería en Inteligencia Artificial","Ingeniería","licenciatura",600,150,"2024/2"),
    AnuiesRecord("003001","UAM Xochimilco","pública","federal","Ciudad de México",55000,"Psicología","Ciencias de la Salud","licenciatura",1500,300,"2024/2"),
    AnuiesRecord("003001","UAM Xochimilco","pública","federal","Ciudad de México",55000,"Administración","Ciencias Sociales","licenciatura",1100,220,"2024/2"),
    AnuiesRecord("004001","Universidad de Guadalajara","pública","estatal","Jalisco",95000,"Ingeniería en Sistemas","Ingeniería","licenciatura",1800,360,"2024/2"),
    AnuiesRecord("004001","Universidad de Guadalajara","pública","estatal","Jalisco",95000,"Contaduría Pública","Ciencias Sociales","licenciatura",2200,440,"2024/2"),
    AnuiesRecord("004001","Universidad de Guadalajara","pública","estatal","Jalisco",95000,"Derecho","Ciencias Sociales","licenciatura",2800,560,"2024/2"),
    AnuiesRecord("005001","BUAP","pública","estatal","Puebla",90000,"Ingeniería en Electrónica","Ingeniería","licenciatura",900,180,"2024/2"),
    AnuiesRecord("005001","BUAP","pública","estatal","Puebla",90000,"Medicina","Ciencias de la Salud","licenciatura",1200,240,"2024/2"),
    AnuiesRecord("006001","UANL","pública","estatal","Nuevo León",75000,"Ingeniería Industrial","Ingeniería","licenciatura",1600,320,"2024/2"),
    AnuiesRecord("006001","UANL","pública","estatal","Nuevo León",75000,"Administración de Empresas","Ciencias Sociales","licenciatura",2000,400,"2024/2"),
    AnuiesRecord("007001","ITAM","privada","privada","Ciudad de México",15000,"Economía","Ciencias Sociales","licenciatura",500,125,"2024/2"),
    AnuiesRecord("007001","ITAM","privada","privada","Ciudad de México",15000,"Matemáticas Aplicadas","Ciencias Exactas","licenciatura",300,75,"2024/2"),
    AnuiesRecord("008001","UV","pública","estatal","Veracruz",60000,"Derecho","Ciencias Sociales","licenciatura",2100,420,"2024/2"),
    AnuiesRecord("008001","UV","pública","estatal","Veracruz",60000,"Ingeniería en Software","Ingeniería","licenciatura",700,140,"2024/2"),
]

# ── Ocupaciones ONET ───────────────────────────────────────────────────────────
ONET_DEMO = [
    {"onet_code":"15-1252.00","nombre":"Software Developers","p_automatizacion":0.28,"p_augmentacion":0.65,"skills":json.dumps(["Python","SQL","Git"]),"tareas":json.dumps(["Diseñar software","Escribir código","Revisar código"]),"sector":"Tecnología","salario_mediana_usd":120000},
    {"onet_code":"15-2051.00","nombre":"Data Scientists","p_automatizacion":0.22,"p_augmentacion":0.70,"skills":json.dumps(["Python","R","ML","Estadística"]),"tareas":json.dumps(["Modelado predictivo","Análisis de datos","Visualización"]),"sector":"Tecnología","salario_mediana_usd":100000},
    {"onet_code":"13-2051.00","nombre":"Financial Analysts","p_automatizacion":0.55,"p_augmentacion":0.45,"skills":json.dumps(["Excel","Python","CFA"]),"tareas":json.dumps(["Analizar estados financieros","Proyecciones","Valuación"]),"sector":"Finanzas","salario_mediana_usd":83000},
    {"onet_code":"23-1011.00","nombre":"Lawyers","p_automatizacion":0.35,"p_augmentacion":0.40,"skills":json.dumps(["Investigación jurídica","Redacción","Litigación"]),"tareas":json.dumps(["Asesorar clientes","Representar en juicios","Redactar contratos"]),"sector":"Legal","salario_mediana_usd":127000},
    {"onet_code":"29-1216.00","nombre":"General Internal Medicine Physicians","p_automatizacion":0.18,"p_augmentacion":0.55,"skills":json.dumps(["Diagnóstico","Medicina interna","IA diagnóstica"]),"tareas":json.dumps(["Diagnosticar enfermedades","Prescribir tratamientos","Supervisar pacientes"]),"sector":"Salud","salario_mediana_usd":215000},
    {"onet_code":"11-1021.00","nombre":"General and Operations Managers","p_automatizacion":0.42,"p_augmentacion":0.50,"skills":json.dumps(["Liderazgo","ERP","Gestión de equipos"]),"tareas":json.dumps(["Planificar operaciones","Supervisar personal","Controlar presupuesto"]),"sector":"Manufactura","salario_mediana_usd":97000},
]

# ── Noticias demo ──────────────────────────────────────────────────────────────
NOW = datetime.now(timezone.utc)
NOTICIAS_DEMO = [
    {"titulo":"SAP elimina 8,000 empleos en reemplazo por automatización IA","url":"https://demo.oia-ee.mx/n/1","fuente":"Reuters","sector":"Tecnología","tipo_impacto":"desplazamiento","causa_ia":"automatización de procesos","n_empleados":8000,"empresa":"SAP","fecha_pub":NOW - timedelta(days=2)},
    {"titulo":"Google DeepMind lanza modelo para diagnóstico médico con 91% precisión","url":"https://demo.oia-ee.mx/n/2","fuente":"MIT Tech Review","sector":"Salud","tipo_impacto":"augmentación","causa_ia":"IA diagnóstica","empresa":"Google DeepMind","fecha_pub":NOW - timedelta(days=5)},
    {"titulo":"Accenture recorta 19,000 puestos tras automatización con IA generativa","url":"https://demo.oia-ee.mx/n/3","fuente":"Bloomberg","sector":"Consultoría","tipo_impacto":"desplazamiento","causa_ia":"IA generativa","n_empleados":19000,"empresa":"Accenture","fecha_pub":NOW - timedelta(days=10)},
    {"titulo":"IBM congela contratación: 7,800 puestos reemplazados por IA en 5 años","url":"https://demo.oia-ee.mx/n/4","fuente":"WSJ","sector":"Tecnología","tipo_impacto":"desplazamiento","causa_ia":"automatización back-office","n_empleados":7800,"empresa":"IBM","fecha_pub":NOW - timedelta(days=15)},
    {"titulo":"México: demanda de ingenieros en IA crece 340% en Nuevo León","url":"https://demo.oia-ee.mx/n/5","fuente":"El Economista","sector":"Tecnología","tipo_impacto":"oportunidad","causa_ia":"demanda de talento IA","fecha_pub":NOW - timedelta(days=3)},
    {"titulo":"Goldman Sachs: IA podría automatizar 300M empleos globalmente","url":"https://demo.oia-ee.mx/n/6","fuente":"Goldman Sachs Research","sector":"Finanzas","tipo_impacto":"desplazamiento","causa_ia":"LLMs en análisis financiero","empresa":"Goldman Sachs","fecha_pub":NOW - timedelta(days=20)},
    {"titulo":"Klarna reemplaza 700 agentes de servicio con chatbot IA","url":"https://demo.oia-ee.mx/n/7","fuente":"FT","sector":"Fintech","tipo_impacto":"desplazamiento","causa_ia":"chatbot IA","n_empleados":700,"empresa":"Klarna","fecha_pub":NOW - timedelta(days=8)},
    {"titulo":"TEC Monterrey lanza maestría en IA: 2,000 lugares disponibles","url":"https://demo.oia-ee.mx/n/8","fuente":"Milenio","sector":"Educación","tipo_impacto":"oportunidad","fecha_pub":NOW - timedelta(days=1)},
    {"titulo":"Automatización reduce empleos en maquiladoras de Juárez 15%","url":"https://demo.oia-ee.mx/n/9","fuente":"La Jornada","sector":"Manufactura","tipo_impacto":"desplazamiento","causa_ia":"robótica + IA","n_empleados":3200,"fecha_pub":NOW - timedelta(days=25)},
    {"titulo":"Microsoft lanza Copilot para abogados: 40% menos tiempo en redacción","url":"https://demo.oia-ee.mx/n/10","fuente":"TechCrunch","sector":"Legal","tipo_impacto":"augmentación","causa_ia":"LLM especializado","empresa":"Microsoft","fecha_pub":NOW - timedelta(hours=36)},
    {"titulo":"BBVA México adopta IA para scoring crediticio: 200 analistas afectados","url":"https://demo.oia-ee.mx/n/11","fuente":"Expansión","sector":"Finanzas","tipo_impacto":"desplazamiento","causa_ia":"ML crediticio","n_empleados":200,"empresa":"BBVA México","fecha_pub":NOW - timedelta(days=12)},
    {"titulo":"OpenAI: GPT-5 puede aprobar examen de medicina en 95% de intentos","url":"https://demo.oia-ee.mx/n/12","fuente":"OpenAI Blog","sector":"Salud","tipo_impacto":"augmentación","causa_ia":"LLM médico","empresa":"OpenAI","fecha_pub":NOW - timedelta(hours=48)},
    {"titulo":"CINVESTAV y UNAM crean laboratorio de IA aplicada a educación","url":"https://demo.oia-ee.mx/n/13","fuente":"Gaceta UNAM","sector":"Educación","tipo_impacto":"oportunidad","fecha_pub":NOW - timedelta(days=7)},
    {"titulo":"Amazon reduce 27,000 empleos en logística por robots Proteus","url":"https://demo.oia-ee.mx/n/14","fuente":"CNBC","sector":"Logística","tipo_impacto":"desplazamiento","causa_ia":"robótica IA","n_empleados":27000,"empresa":"Amazon","fecha_pub":NOW - timedelta(days=30)},
    {"titulo":"Guadalajara se posiciona como hub de startups IA en Latinoamérica","url":"https://demo.oia-ee.mx/n/15","fuente":"Forbes México","sector":"Tecnología","tipo_impacto":"oportunidad","fecha_pub":NOW - timedelta(days=4)},
]

# ── Vacantes demo ──────────────────────────────────────────────────────────────
HOY = date.today()
STPS_DEMO: list[StpsVacante] = [
    StpsVacante("ML Engineer Senior","Wizeline",["Python","TensorFlow","MLOps"],80000,120000,HOY,"Jalisco","licenciatura",3,"Tecnología"),
    StpsVacante("Data Scientist","BBVA México",["Python","SQL","Spark"],60000,90000,HOY - timedelta(days=2),"Ciudad de México","licenciatura",2,"Finanzas"),
    StpsVacante("Ingeniero en IA","Intel México",["C++","CUDA","Python"],70000,100000,HOY - timedelta(days=1),"Jalisco","licenciatura",3,"Tecnología"),
    StpsVacante("Analista Financiero","Banorte",["Excel","Python","Bloomberg"],35000,55000,HOY - timedelta(days=3),"Nuevo León","licenciatura",1,"Finanzas"),
    StpsVacante("Backend Developer","Clip",["Go","PostgreSQL","Docker"],50000,80000,HOY,"Ciudad de México","licenciatura",2,"Fintech"),
    StpsVacante("Data Engineer","Rappi",["Spark","Airflow","SQL"],55000,85000,HOY - timedelta(days=5),"Ciudad de México","licenciatura",2,"Tecnología"),
    StpsVacante("Product Manager IA","Konfío",["Python","A/B Testing","SQL"],65000,95000,HOY - timedelta(days=4),"Ciudad de México","licenciatura",4,"Fintech"),
    StpsVacante("Científico de Datos","INEGI",["R","Python","Estadística"],30000,45000,HOY - timedelta(days=7),"Ciudad de México","licenciatura",2,"Gobierno"),
    StpsVacante("Desarrollador IA","Aeromexico",["Python","NLP","REST API"],45000,70000,HOY - timedelta(days=2),"Ciudad de México","licenciatura",2,"Logística"),
    StpsVacante("ML Ops Engineer","OCC Mundial",["Kubernetes","MLflow","Python"],60000,90000,HOY - timedelta(days=1),"Jalisco","licenciatura",3,"Tecnología"),
    StpsVacante("Analista de Riesgo","Grupo Financiero Santander",["SAS","Python","SQL"],38000,58000,HOY - timedelta(days=6),"Ciudad de México","licenciatura",2,"Finanzas"),
    StpsVacante("NLP Engineer","Conekta",["Python","BERT","FastAPI"],55000,82000,HOY,"Ciudad de México","licenciatura",3,"Fintech"),
    StpsVacante("Ingeniero de Manufactura IA","CEMEX",["Python","SCADA","IoT"],40000,65000,HOY - timedelta(days=3),"Nuevo León","licenciatura",2,"Manufactura"),
    StpsVacante("Research Scientist","CIMAT",["Python","PyTorch","LaTeX"],35000,55000,HOY - timedelta(days=8),"Guanajuato","maestría",1,"Educación"),
    StpsVacante("Full Stack Developer","Kavak",["React","Node.js","PostgreSQL"],45000,70000,HOY - timedelta(days=2),"Ciudad de México","licenciatura",2,"Tecnología"),
    StpsVacante("Especialista en Ciberseguridad IA","Telcel",["Python","SIEM","ML"],50000,80000,HOY - timedelta(days=1),"Ciudad de México","licenciatura",3,"Telecomunicaciones"),
    StpsVacante("Data Analyst","Liverpool",["SQL","Power BI","Python"],28000,42000,HOY - timedelta(days=4),"Ciudad de México","licenciatura",1,"Retail"),
    StpsVacante("Arquitecto de Soluciones IA","Oracle México",["Python","OCI","ML"],90000,130000,HOY - timedelta(days=3),"Jalisco","licenciatura",5,"Tecnología"),
    StpsVacante("Ingeniero en Robótica","Bosch México",["ROS","Python","C++"],48000,72000,HOY - timedelta(days=5),"Puebla","licenciatura",3,"Manufactura"),
    StpsVacante("Analista BI","Coppel",["Power BI","SQL","Python"],25000,40000,HOY - timedelta(days=6),"Sinaloa","licenciatura",1,"Retail"),
    StpsVacante("DevOps Engineer","Kueski",["Terraform","AWS","Python"],55000,85000,HOY - timedelta(days=2),"Ciudad de México","licenciatura",3,"Fintech"),
    StpsVacante("Especialista en IA Educativa","Aprende.mx",["Python","EdTech","NLP"],40000,60000,HOY - timedelta(days=1),"Ciudad de México","licenciatura",2,"Educación"),
    StpsVacante("Científico de Datos en Salud","IMSS",["R","Python","SQL"],32000,48000,HOY - timedelta(days=9),"Ciudad de México","maestría",2,"Salud"),
    StpsVacante("Computer Vision Engineer","Mabe",["OpenCV","Python","TensorFlow"],52000,78000,HOY - timedelta(days=4),"Estado de México","licenciatura",3,"Manufactura"),
    StpsVacante("AI Product Analyst","Mercado Libre",["SQL","Python","Tableau"],50000,75000,HOY,"Ciudad de México","licenciatura",2,"E-commerce"),
]


@dataclass
class SeedResult:
    ies_creadas: int
    carreras_creadas: int
    ocupaciones: int
    noticias: int
    vacantes: int


def run_seed_demo(session: Session, limpiar: bool = False) -> SeedResult:
    """Puebla la BD con datos demo. limpiar=True borra datos previos demo."""
    if limpiar:
        _limpiar_datos_demo(session)

    # IES + Carreras + CarreraIES
    anuies_result = ingest_anuies(ANUIES_DEMO, session)

    # Ocupaciones ONET
    onet_count = 0
    for occ_data in ONET_DEMO:
        if session.query(Ocupacion).filter_by(onet_code=occ_data["onet_code"]).first():
            continue
        session.add(Ocupacion(**occ_data))
        onet_count += 1

    # Vincular onet_codes a carreras
    _vincular_onet(session)

    # Noticias
    noticias_count = 0
    for n_data in NOTICIAS_DEMO:
        if session.query(Noticia).filter_by(url=n_data["url"]).first():
            continue
        session.add(Noticia(**n_data))
        noticias_count += 1

    # Vacantes
    stps_result = ingest_stps(STPS_DEMO, session)

    session.commit()
    logger.info(
        "seed_demo OK: IES=%d carreras=%d onet=%d noticias=%d vacantes=%d",
        anuies_result.ies_creadas, anuies_result.carreras_creadas,
        onet_count, noticias_count, stps_result.insertadas,
    )
    return SeedResult(
        ies_creadas=anuies_result.ies_creadas,
        carreras_creadas=anuies_result.carreras_creadas,
        ocupaciones=onet_count,
        noticias=noticias_count,
        vacantes=stps_result.insertadas,
    )


def _vincular_onet(session: Session) -> None:
    """Asigna onet_codes a carreras por nombre aproximado."""
    mapping = {
        "ingeniería en computación": ["15-1252.00"],
        "ingeniería en sistemas computacionales": ["15-1252.00"],
        "ingeniería en sistemas": ["15-1252.00"],
        "ingeniería en software": ["15-1252.00"],
        "ciencia de datos": ["15-2051.00"],
        "ingeniería en inteligencia artificial": ["15-2051.00", "15-1252.00"],
        "matemáticas aplicadas": ["15-2051.00"],
        "economía": ["13-2051.00"],
        "administración de empresas": ["11-1021.00"],
        "administración": ["11-1021.00"],
        "contaduría pública": ["13-2051.00"],
        "derecho": ["23-1011.00"],
        "medicina": ["29-1216.00"],
        "ingeniería industrial": ["11-1021.00"],
        "ingeniería en electrónica": ["15-1252.00"],
        "psicología": ["29-1216.00"],
    }
    import json as _json
    for norm, codes in mapping.items():
        carrera = session.query(Carrera).filter_by(nombre_norm=norm).first()
        if carrera and not carrera.onet_codes_relacionados:
            carrera.onet_codes_relacionados = _json.dumps(codes)

    # Vincular CarreraIES con plan_estudio_skills basado en sector de onet
    carreras_tech = {"ingeniería en computación","ingeniería en sistemas computacionales",
                     "ciencia de datos","ingeniería en inteligencia artificial","ingeniería en software"}
    for norm in carreras_tech:
        carrera = session.query(Carrera).filter_by(nombre_norm=norm).first()
        if not carrera:
            continue
        for cie in session.query(CarreraIES).filter_by(carrera_id=carrera.id).all():
            if not cie.plan_estudio_skills:
                cie.plan_estudio_skills = _json.dumps(["Python","SQL","ML","Git","Docker"])
                cie.costo_anual_mxn = 95000 if "TEC" in (session.get(IES, cie.ies_id).nombre if cie.ies_id else "") else 20000


def _limpiar_datos_demo(session: Session) -> None:
    """Borra registros demo por URL/clave conocida. No toca datos de usuarios."""
    demo_urls = {n["url"] for n in NOTICIAS_DEMO}
    demo_claves = {r.clave_sep for r in ANUIES_DEMO}
    session.query(Noticia).filter(Noticia.url.in_(demo_urls)).delete(synchronize_session=False)
    ies_ids = [i.id for i in session.query(IES).filter(IES.clave_sep.in_(demo_claves)).all()]
    if ies_ids:
        session.query(CarreraIES).filter(CarreraIES.ies_id.in_(ies_ids)).delete(synchronize_session=False)
        session.query(IES).filter(IES.id.in_(ies_ids)).delete(synchronize_session=False)


if __name__ == "__main__":
    with get_session() as session:
        result = run_seed_demo(session)
        print(f"Seed completado: {result}")
