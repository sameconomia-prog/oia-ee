import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, SmallInteger, Boolean, Date,
    DateTime, Numeric, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


def _uuid():
    return str(uuid.uuid4())


class Noticia(Base):
    __tablename__ = "noticias"
    id             = Column(String(36), primary_key=True, default=_uuid)
    titulo         = Column(Text, nullable=False)
    url            = Column(Text, unique=True, nullable=False)
    fuente         = Column(String(50))
    fecha_pub      = Column(DateTime(timezone=True))
    fecha_ingesta  = Column(DateTime(timezone=True), default=datetime.utcnow)
    sector         = Column(String(100))
    pais           = Column(String(50))
    tipo_impacto   = Column(String(30))
    n_empleados    = Column(Integer)
    empresa        = Column(Text)
    causa_ia       = Column(Text)
    resumen_claude = Column(Text)
    embedding_json = Column(Text)
    embedding      = Column(Vector(1536), nullable=True)
    # embedding_json se mantiene para migración gradual; se eliminará en P1
    raw_content    = Column(Text)


class Vacante(Base):
    __tablename__ = "vacantes"
    id               = Column(String(36), primary_key=True, default=_uuid)
    titulo           = Column(Text, nullable=False)
    empresa          = Column(Text)
    sector           = Column(String(100))
    skills           = Column(Text)
    salario_min      = Column(Integer)
    salario_max      = Column(Integer)
    fecha_pub        = Column(Date)
    fuente           = Column(String(30))
    pais             = Column(String(50), default="México")
    estado           = Column(String(100))
    nivel_educativo  = Column(String(50))
    experiencia_anios = Column(SmallInteger)
    raw_json         = Column(Text)


class Ocupacion(Base):
    __tablename__ = "ocupaciones"
    onet_code        = Column(String(10), primary_key=True)
    nombre           = Column(Text, nullable=False)
    p_automatizacion = Column(Numeric(4, 3))
    p_augmentacion   = Column(Numeric(4, 3))
    skills           = Column(Text)
    tareas           = Column(Text)
    sector           = Column(String(100))
    salario_mediana_usd = Column(Integer)


class IES(Base):
    __tablename__ = "ies"
    id             = Column(String(36), primary_key=True, default=_uuid)
    clave_sep      = Column(String(20), unique=True)
    nombre         = Column(Text, nullable=False)
    nombre_corto   = Column(String(100))
    tipo           = Column(String(30))
    subsistema     = Column(String(100))
    estado         = Column(String(100))
    pais           = Column(String(50), default="México")
    matricula_total = Column(Integer)
    lat            = Column(Numeric(9, 6))
    lng            = Column(Numeric(9, 6))
    activa         = Column(Boolean, default=True)
    carreras       = relationship("CarreraIES", back_populates="ies")


class Carrera(Base):
    __tablename__ = "carreras"
    id                    = Column(String(36), primary_key=True, default=_uuid)
    nombre_norm           = Column(Text, unique=True, nullable=False)
    nombre_variantes      = Column(Text)
    area_conocimiento     = Column(String(100))
    nivel                 = Column(String(30))
    duracion_anios        = Column(SmallInteger)
    onet_codes_relacionados = Column(Text)
    ies_registros         = relationship("CarreraIES", back_populates="carrera")


class CarreraIES(Base):
    __tablename__ = "carrera_ies"
    id                        = Column(String(36), primary_key=True, default=_uuid)
    carrera_id                = Column(String(36), ForeignKey("carreras.id"))
    ies_id                    = Column(String(36), ForeignKey("ies.id"))
    ciclo                     = Column(String(10))
    matricula                 = Column(Integer)
    egresados                 = Column(Integer)
    costo_anual_mxn           = Column(Integer)
    plan_estudio_skills       = Column(Text)
    ultima_actualizacion_plan = Column(Date)
    carrera                   = relationship("Carrera", back_populates="ies_registros")
    ies                       = relationship("IES", back_populates="carreras")
    __table_args__ = (UniqueConstraint("carrera_id", "ies_id", "ciclo"),)


class KpiHistorico(Base):
    __tablename__ = "kpi_historico"
    id             = Column(String(36), primary_key=True, default=_uuid)
    entidad_tipo   = Column(String(20))
    entidad_id     = Column(String(36))
    entidad_nombre = Column(Text)
    fecha          = Column(Date, nullable=False)
    kpi_nombre     = Column(String(30))
    valor          = Column(Numeric(12, 4))
    metadatos      = Column(Text)
    __table_args__ = (
        Index("idx_kpi_historico", "entidad_tipo", "entidad_id", "kpi_nombre", "fecha"),
    )


class Alerta(Base):
    __tablename__ = "alertas"
    id              = Column(String(36), primary_key=True, default=_uuid)
    ies_id          = Column(String(36), ForeignKey("ies.id"))
    carrera_id      = Column(String(36), ForeignKey("carreras.id"))
    tipo            = Column(String(50))
    severidad       = Column(String(10))
    titulo          = Column(Text)
    mensaje         = Column(Text)
    accion_sugerida = Column(Text)
    fecha           = Column(DateTime(timezone=True), default=datetime.utcnow)
    leida           = Column(Boolean, default=False)


class Escenario(Base):
    __tablename__ = "escenarios"
    id              = Column(String(36), primary_key=True, default=_uuid)
    ies_id          = Column(String(36), ForeignKey("ies.id"))
    tipo            = Column(String(20))
    horizonte_anios = Column(SmallInteger)
    acciones        = Column(Text)
    proyecciones    = Column(Text)
    fecha_creacion  = Column(DateTime(timezone=True), default=datetime.utcnow)


class Usuario(Base):
    __tablename__ = "usuarios"
    id              = Column(String(36), primary_key=True, default=_uuid)
    username        = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    ies_id          = Column(String(36), ForeignKey("ies.id"), nullable=False)
    activo          = Column(Boolean, default=True)
    email           = Column(String(200), nullable=True)
    rol             = Column(String(20), nullable=False, default="viewer")
    # Valores válidos: 'viewer', 'researcher', 'admin_ies', 'superadmin'


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id          = Column(String(36), primary_key=True, default=_uuid)
    usuario_id  = Column(String(36), ForeignKey("usuarios.id"), nullable=False)
    token       = Column(String(255), unique=True, nullable=False)
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    revocado    = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    usuario     = relationship("Usuario")


class SolicitudPertinencia(Base):
    __tablename__ = "solicitudes_pertinencia"
    id               = Column(String(36), primary_key=True, default=_uuid)
    nombre_contacto  = Column(String(200), nullable=False)
    email_contacto   = Column(String(200), nullable=False)
    ies_nombre       = Column(String(300), nullable=False)
    carrera_nombre   = Column(String(300), nullable=False)
    mensaje          = Column(Text, nullable=True)
    estado           = Column(String(30), nullable=False, default="pendiente")
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)


class Lead(Base):
    __tablename__ = "leads"
    id          = Column(String(36), primary_key=True, default=_uuid)
    nombre      = Column(String(200), nullable=False)
    cargo       = Column(String(100), nullable=True)
    ies_nombre  = Column(String(300), nullable=False)
    email       = Column(String(200), nullable=False)
    telefono    = Column(String(30), nullable=True)
    mensaje     = Column(Text, nullable=True)
    origen      = Column(String(50), nullable=False, default="demo")
    estado      = Column(String(30), nullable=False, default="nuevo")
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)


class Contacto(Base):
    __tablename__ = "contactos"
    id           = Column(String(36), primary_key=True, default=_uuid)
    tipo         = Column(String(20), nullable=False)          # 'ies' | 'gobierno'
    nombre       = Column(String(200), nullable=False)
    cargo        = Column(String(100), nullable=True)
    institucion  = Column(String(300), nullable=False)
    email        = Column(String(200), nullable=False)
    area_interes = Column(String(50), nullable=True)           # solo tipo gobierno
    mensaje      = Column(Text, nullable=True)
    estado       = Column(String(30), nullable=False, default="nuevo")
    created_at   = Column(DateTime(timezone=True), default=datetime.utcnow)


# Importar modelos del Radar para que Alembic los detecte
from pipeline.db.models_radar import EventoIADespido, EventoIAEmpleo, SkillEmergente  # noqa: F401
from pipeline.db.models_predictor import PrediccionKpi  # noqa: F401
from pipeline.db.models_siia import SiiaMatricula, SiiaToken  # noqa: F401
from pipeline.db.models_whitelabel import WhiteLabelConfig  # noqa: F401
