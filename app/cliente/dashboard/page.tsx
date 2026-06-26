"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AnyRecord = Record<string, any>;

type UsuarioLocal = {
  id: string;
  nome?: string | null;
  email?: string | null;
  tipo?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
  imagem_url?: string | null;
};

type Stats = {
  totalKm: number;
  totalTrilhas: number;
  reservasPendentes: number;
  reservasConfirmadas: number;
  reservasRealizadas: number;
  totalMedalhas: number;
  ultimaAtividade: string;
};

type Roteiro = {
  id: string;
  titulo?: string | null;
  nome?: string | null;
  foto_capa?: string | null;
  foto_url?: string | null;
  imagem_url?: string | null;
  image_url?: string | null;
  capa_url?: string | null;
  preco?: number | null;
  valor?: number | null;
  km?: number | null;
  distancia_km?: number | null;
  dificuldade?: string | null;
  localizacao?: string | null;
  local?: string | null;
  cidade?: string | null;
  destino?: string | null;
  status?: string | null;
  situacao?: string | null;
  publicacao?: string | null;
  ativo?: boolean | null;
  aprovado?: boolean | null;
  created_at?: string | null;
};

type Reserva = {
  id: string;
  data_trilha?: string | null;
  data_roteiro?: string | null;
  created_at?: string | null;
  roteiro?: Roteiro | null;
  roteiro_titulo?: string;
  roteiro_foto?: string;
};

type Notificacao = {
  id: string;
  titulo: string;
  texto: string;
  destino?: string;
  emoji: string;
  tipo: "all" | "com";
  tipoEvento?: string;
  created_at?: string | null;
};

type MedalhaResumo = {
  id?: string | null;
  nome?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  imagem_url?: string | null;
  image_url?: string | null;
  foto_url?: string | null;
  icone_url?: string | null;
  icon_url?: string | null;
  svg_url?: string | null;
  caminho_svg?: string | null;
  desbloqueada_em?: string | null;
  unlocked_at?: string | null;
  created_at?: string | null;
};

const statsInicial: Stats = {
  totalKm: 0,
  totalTrilhas: 0,
  reservasPendentes: 0,
  reservasConfirmadas: 0,
  reservasRealizadas: 0,
  totalMedalhas: 0,
  ultimaAtividade: "Ainda sem atividade registrada",
};

function numeroDeCampos(objeto: AnyRecord | null | undefined, campos: string[], fallback = 0) {
  if (!objeto || typeof objeto !== "object") return fallback;

  for (const campo of campos) {
    const valor = objeto[campo];
    if (valor !== undefined && valor !== null && valor !== "") {
      const numero = Number(valor);
      if (Number.isFinite(numero)) return numero;
    }
  }

  return fallback;
}

function textoDeCampos(objeto: AnyRecord | null | undefined, campos: string[], fallback = "") {
  if (!objeto || typeof objeto !== "object") return fallback;

  for (const campo of campos) {
    const valor = texto(objeto[campo]);
    if (valor) return valor;
  }

  return fallback;
}

function normalizarStatsDashboard(data: AnyRecord | null | undefined): Stats {
  const stats = (data?.stats || {}) as AnyRecord;
  const metricas = (data?.metricas || data?.estatisticas || data?.resumo || {}) as AnyRecord;
  const usuario = (data?.usuario || data?.cliente || {}) as AnyRecord;

  const fontes = [stats, metricas, usuario, data || {}];

  function n(campos: string[], fallback = 0) {
    for (const fonte of fontes) {
      const valor = numeroDeCampos(fonte, campos, Number.NaN);
      if (Number.isFinite(valor)) return valor;
    }
    return fallback;
  }

  function s(campos: string[], fallback = statsInicial.ultimaAtividade) {
    for (const fonte of fontes) {
      const valor = textoDeCampos(fonte, campos, "");
      if (valor) return valor;
    }
    return fallback;
  }

  return {
    totalKm: n([
      "totalKm",
      "total_km",
      "kmPercorridos",
      "km_percorridos",
      "km_realizados",
      "quilometragem",
      "distancia_total",
      "distanciaTotal",
    ]),
    totalTrilhas: n([
      "totalTrilhas",
      "total_trilhas",
      "trilhasRealizadas",
      "trilhas_realizadas",
      "roteirosRealizados",
      "roteiros_realizados",
      "experienciasRealizadas",
      "experiencias_realizadas",
    ]),
    reservasPendentes: n([
      "reservasPendentes",
      "reservas_pendentes",
      "pendentes",
      "reservasAguardandoPagamento",
      "reservas_aguardando_pagamento",
    ]),
    reservasConfirmadas: n([
      "reservasConfirmadas",
      "reservas_confirmadas",
      "confirmadas",
      "reservasPagas",
      "reservas_pagas",
    ]),
    reservasRealizadas: n([
      "reservasRealizadas",
      "reservas_realizadas",
      "realizadas",
      "trilhasRealizadas",
      "trilhas_realizadas",
    ]),
    totalMedalhas: n([
      "totalMedalhas",
      "total_medalhas",
      "medalhas",
      "medalhasConquistadas",
      "medalhas_conquistadas",
      "conquistas",
      "totalConquistas",
      "total_conquistas",
    ]),
    ultimaAtividade: s([
      "ultimaAtividade",
      "ultima_atividade",
      "ultimaAtividadeEm",
      "ultima_atividade_em",
      "ultimaAtualizacao",
      "ultima_atualizacao",
    ]),
  };
}

function mesclarStats(principal: Stats, complemento?: AnyRecord | null): Stats {
  if (!complemento) return principal;

  const normalizado = normalizarStatsDashboard(complemento);

  return {
    totalKm: normalizado.totalKm || principal.totalKm,
    totalTrilhas: normalizado.totalTrilhas || principal.totalTrilhas,
    reservasPendentes: normalizado.reservasPendentes || principal.reservasPendentes,
    reservasConfirmadas: normalizado.reservasConfirmadas || principal.reservasConfirmadas,
    reservasRealizadas: normalizado.reservasRealizadas || principal.reservasRealizadas,
    totalMedalhas: normalizado.totalMedalhas || principal.totalMedalhas,
    ultimaAtividade:
      normalizado.ultimaAtividade !== statsInicial.ultimaAtividade
        ? normalizado.ultimaAtividade
        : principal.ultimaAtividade,
  };
}

const LIMITE_NOTIFICACOES_CARD = 5;

const notificacaoVaziaAll: Notificacao = {
  id: "empty-all",
  titulo: "A comunidade está começando a se mover",
  texto:
    "Quando novos guias, roteiros e conquistas aparecerem, você verá tudo aqui.",
  emoji: "🌿",
  tipo: "all",
  destino: "/roteiros",
  created_at: null,
};

const notificacaoVaziaCom: Notificacao = {
  id: "empty-com",
  titulo: "Siga guias e aventureiros para movimentar a COM",
  texto:
    "Roteiros de guias seguidos, curtidas e interações relacionadas a você aparecerão aqui.",
  emoji: "👣",
  tipo: "com",
  destino: "/roteiros",
  created_at: null,
};

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizar(valor: unknown) {
  return texto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function formatarKm(valor: unknown) {
  const km = numeroSeguro(valor);
  return km.toLocaleString("pt-BR", {
    maximumFractionDigits: km % 1 === 0 ? 0 : 1,
  });
}

function formatarMoeda(valor: unknown) {
  return numeroSeguro(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHora(valor?: string | null) {
  const raw = texto(valor);
  if (!raw) return "";

  const data = new Date(raw);
  if (Number.isNaN(data.getTime())) return raw.slice(0, 10);

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.titulo || roteiro?.nome) || "Roteiro PrussikTrails";
}

function fotoRoteiro(roteiro?: Roteiro | null) {
  return texto(
    roteiro?.foto_capa ||
      roteiro?.foto_url ||
      roteiro?.imagem_url ||
      roteiro?.image_url ||
      roteiro?.capa_url,
  );
}

function localRoteiro(roteiro?: Roteiro | null) {
  return (
    texto(
      roteiro?.localizacao ||
        roteiro?.local ||
        roteiro?.cidade ||
        roteiro?.destino,
    ) || "Experiência outdoor"
  );
}

function precoRoteiro(roteiro?: Roteiro | null) {
  return numeroSeguro(roteiro?.preco ?? roteiro?.valor);
}

function nomeMedalhaResumo(medalha?: MedalhaResumo | null) {
  return texto(medalha?.nome || medalha?.titulo) || "Nova conquista";
}

function imagemMedalhaResumo(medalha?: MedalhaResumo | null) {
  return texto(
    medalha?.imagem_url ||
      medalha?.image_url ||
      medalha?.foto_url ||
      medalha?.icone_url ||
      medalha?.icon_url ||
      medalha?.svg_url ||
      medalha?.caminho_svg,
  );
}

function dataMedalhaResumo(medalha?: MedalhaResumo | null) {
  return texto(medalha?.desbloqueada_em || medalha?.unlocked_at || medalha?.created_at);
}

function extrairUltimaMedalha(data: AnyRecord): MedalhaResumo | null {
  const candidatos = [
    data?.ultimaMedalha,
    data?.ultima_medalha,
    data?.ultimaConquista,
    data?.ultima_conquista,
    data?.conquistaRecente,
    data?.conquista_recente,
    Array.isArray(data?.medalhasDesbloqueadas) ? data.medalhasDesbloqueadas[0] : null,
    Array.isArray(data?.medalhas_desbloqueadas) ? data.medalhas_desbloqueadas[0] : null,
    Array.isArray(data?.conquistas) ? data.conquistas[0] : null,
    Array.isArray(data?.medalhas) ? data.medalhas[0] : null,
    Array.isArray(data?.usuario?.medalhas) ? data.usuario.medalhas[0] : null,
  ];

  const medalha = candidatos.find((item) => item && typeof item === "object");
  return medalha ? (medalha as MedalhaResumo) : null;
}

async function buscarMapaRoteirosPorIds(ids: string[]) {
  const idsValidos = Array.from(new Set(ids.map((id) => texto(id)).filter(Boolean)));
  const mapa = new Map<string, Roteiro>();

  if (idsValidos.length === 0) return mapa;

  try {
    const { data, error } = await supabase
      .from("roteiros")
      .select("id, titulo, nome, localizacao, local, cidade, destino, foto_capa, foto_url, imagem_url, image_url, capa_url, preco, valor, dificuldade")
      .in("id", idsValidos);

    if (error) {
      console.warn("Não foi possível buscar dados dos roteiros das notificações:", error);
      return mapa;
    }

    ((data || []) as Roteiro[]).forEach((roteiro) => {
      if (roteiro?.id) mapa.set(String(roteiro.id), roteiro);
    });
  } catch (error) {
    console.warn("Erro ao buscar dados dos roteiros das notificações:", error);
  }

  return mapa;
}

function enriquecerItemComRoteiro(item: AnyRecord, mapa: Map<string, Roteiro>) {
  const roteiroId = idRoteiroNotificacao(item);
  const roteiro = roteiroId ? mapa.get(roteiroId) : null;

  if (!roteiro) return item;

  return {
    ...item,
    roteiro_id: roteiroId,
    roteiro_titulo: primeiroTextoSemRotaRoteiro(item?.roteiro_titulo, item?.nome_roteiro, item?.titulo_roteiro) || tituloRoteiro(roteiro),
    nome_roteiro: primeiroTextoSemRotaRoteiro(item?.nome_roteiro) || tituloRoteiro(roteiro),
    roteiro_local: primeiroTextoSemRotaRoteiro(item?.roteiro_local, item?.local_roteiro, item?.localizacao, item?.local, item?.cidade) || localRoteiro(roteiro),
    localizacao: primeiroTextoSemRotaRoteiro(item?.localizacao, item?.local, item?.cidade) || localRoteiro(roteiro),
    destino_url: `/roteiros/${roteiroId}`,
  };
}

function enriquecerNotificacaoComRoteiro(item: Notificacao, mapa: Map<string, Roteiro>): Notificacao {
  const roteiroId = extrairRoteiroIdDeValor(item.destino);
  const roteiro = roteiroId ? mapa.get(roteiroId) : null;

  if (!roteiro) return item;

  const titulo = tituloRoteiro(roteiro);
  const local = localRoteiro(roteiro);

  const tituloAtual = texto(item.titulo);
  const tituloSeguro = valorPareceRotaRoteiro(tituloAtual)
    ? local
      ? `Novo roteiro: ${local}`
      : "Novo roteiro publicado"
    : tituloAtual;

  return {
    ...item,
    titulo: tituloSeguro,
    texto: titulo && local && normalizar(titulo) !== normalizar(local)
      ? `${titulo} · ${local}`
      : titulo || local || item.texto,
    destino: `/roteiros/${roteiroId}`,
  };
}

function nomeUsuario(user?: UsuarioLocal | null) {
  return texto(user?.nome || user?.email) || "Aventureiro";
}

function avatarUsuario(user?: UsuarioLocal | null) {
  return texto(user?.avatar_url || user?.foto_url || user?.imagem_url);
}

function metadataNotificacao(item: AnyRecord) {
  return item?.metadata || item?.detalhes || item?.extra || {};
}

function tipoEventoNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);
  return normalizar(
    item?.tipo_evento ||
      item?.evento ||
      item?.acao ||
      item?.tipo ||
      item?.categoria ||
      metadata?.tipo ||
      metadata?.evento,
  );
}

function extrairRoteiroIdDeValor(valor: unknown) {
  const raw = texto(valor);
  if (!raw) return "";

  const matchRota = raw.match(/\/roteiros\/([^\/?#\s]+)/i);
  if (matchRota?.[1]) return texto(matchRota[1]);

  const matchUuid = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (matchUuid?.[0]) return texto(matchUuid[0]);

  return "";
}

function valorPareceRotaRoteiro(valor: unknown) {
  const raw = texto(valor);
  if (!raw) return false;
  return raw.includes("/roteiros/") || Boolean(extrairRoteiroIdDeValor(raw));
}

function textoSemRotaRoteiro(valor: unknown) {
  const item = texto(valor);
  if (!item) return "";
  if (valorPareceRotaRoteiro(item)) return "";
  return item;
}

function primeiroTextoSemRotaRoteiro(...valores: unknown[]) {
  for (const valor of valores) {
    const item = textoSemRotaRoteiro(valor);
    if (item) return item;
  }

  return "";
}

function idRoteiroNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);

  return texto(
    item?.roteiro_id ||
      item?.id_roteiro ||
      item?.roteiroId ||
      metadata?.roteiro_id ||
      metadata?.id_roteiro ||
      metadata?.roteiroId ||
      extrairRoteiroIdDeValor(item?.destino_url) ||
      extrairRoteiroIdDeValor(item?.destino) ||
      extrairRoteiroIdDeValor(item?.rota) ||
      extrairRoteiroIdDeValor(item?.url) ||
      extrairRoteiroIdDeValor(item?.titulo) ||
      extrairRoteiroIdDeValor(item?.texto) ||
      extrairRoteiroIdDeValor(item?.mensagem) ||
      extrairRoteiroIdDeValor(item?.descricao) ||
      extrairRoteiroIdDeValor(metadata?.destino_url) ||
      extrairRoteiroIdDeValor(metadata?.destino) ||
      extrairRoteiroIdDeValor(metadata?.rota) ||
      extrairRoteiroIdDeValor(metadata?.url),
  );
}

function notificacaoEhRoteiro(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item);
  const titulo = normalizar(
    item?.titulo || item?.descricao || item?.mensagem || item?.texto,
  );
  return (
    Boolean(idRoteiroNotificacao(item)) ||
    tipo.includes("roteiro") ||
    titulo.includes("roteiro") ||
    titulo.includes("publicou")
  );
}

function nomePessoaNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);
  return texto(
    item?.nome_usuario ||
      item?.usuario_nome ||
      item?.nome ||
      item?.actor_nome ||
      item?.ator_nome ||
      item?.guia_nome ||
      metadata?.nome_usuario ||
      metadata?.usuario_nome ||
      metadata?.nome ||
      metadata?.actor_nome ||
      metadata?.ator_nome ||
      metadata?.guia_nome,
  );
}

function destinoPorPerfil(usuarioId: string, tipoUsuario?: string | null) {
  const tipo = normalizar(tipoUsuario);
  if (!usuarioId) return "/cliente/dashboard";
  if (tipo.includes("guia")) return `/guia/publico/${usuarioId}`;
  return `/cliente/publico/${usuarioId}`;
}

function destinoNotificacao(item: AnyRecord, fallback = "/cliente/dashboard") {
  const metadata = metadataNotificacao(item);
  const roteiroId = idRoteiroNotificacao(item);

  if (notificacaoEhRoteiro(item) && roteiroId) {
    return `/roteiros/${roteiroId}`;
  }

  const direto = texto(
    item?.destino_url ||
      item?.destino ||
      item?.rota ||
      item?.url ||
      metadata?.destino_url ||
      metadata?.destino ||
      metadata?.rota ||
      metadata?.url,
  );
  if (direto) return direto;

  if (roteiroId) return `/roteiros/${roteiroId}`;

  const actorId = texto(
    item?.actor_id ||
      item?.ator_id ||
      item?.usuario_origem_id ||
      metadata?.actor_id ||
      metadata?.ator_id,
  );
  const usuarioId = texto(
    item?.usuario_id || metadata?.usuario_id || metadata?.user_id,
  );

  if (actorId)
    return destinoPorPerfil(
      actorId,
      item?.actor_tipo ||
        item?.tipo_actor ||
        metadata?.tipo_usuario ||
        metadata?.actor_tipo,
    );
  if (usuarioId)
    return destinoPorPerfil(
      usuarioId,
      item?.tipo_usuario || metadata?.tipo_usuario,
    );

  return fallback;
}

function destinoPerfilQuemFez(
  item: AnyRecord,
  fallback = "/cliente/dashboard",
) {
  const metadata = metadataNotificacao(item);

  const actorId = texto(
    item?.actor_id ||
      item?.ator_id ||
      item?.usuario_origem_id ||
      item?.autor_id ||
      item?.dono_id ||
      metadata?.actor_id ||
      metadata?.ator_id ||
      metadata?.usuario_origem_id ||
      metadata?.autor_id ||
      metadata?.dono_id,
  );

  const actorTipo =
    item?.actor_tipo ||
    item?.tipo_actor ||
    item?.ator_tipo ||
    metadata?.actor_tipo ||
    metadata?.tipo_actor ||
    metadata?.ator_tipo ||
    metadata?.tipo_usuario;

  if (actorId) return destinoPorPerfil(actorId, actorTipo);

  const usuarioId = texto(
    item?.usuario_id ||
      item?.user_id ||
      item?.cliente_id ||
      item?.id_usuario ||
      metadata?.usuario_id ||
      metadata?.user_id ||
      metadata?.cliente_id ||
      metadata?.id_usuario,
  );

  const usuarioTipo =
    item?.tipo_usuario ||
    item?.usuario_tipo ||
    metadata?.tipo_usuario ||
    metadata?.usuario_tipo;

  if (usuarioId) return destinoPorPerfil(usuarioId, usuarioTipo);

  return fallback;
}

function notificacaoEhReserva(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item);
  const titulo = normalizar(
    item?.titulo || item?.descricao || item?.mensagem || item?.texto,
  );
  const metadata = metadataNotificacao(item);
  const categoria = normalizar(
    metadata?.tipo || metadata?.categoria || metadata?.evento,
  );

  return (
    tipo.includes("reserva") ||
    categoria.includes("reserva") ||
    titulo.includes("reserva feita") ||
    titulo.includes("nova reserva") ||
    titulo.includes("reserva confirmada") ||
    titulo.includes("pagamento iniciado")
  );
}

function notificacaoEhConquista(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item);
  const titulo = normalizar(
    item?.titulo || item?.descricao || item?.mensagem || item?.texto,
  );
  const metadata = metadataNotificacao(item);
  const categoria = normalizar(
    metadata?.tipo || metadata?.categoria || metadata?.evento,
  );

  return (
    tipo.includes("medalha") ||
    tipo.includes("conquista") ||
    categoria.includes("medalha") ||
    categoria.includes("conquista") ||
    titulo.includes("conquista desbloqueada") ||
    titulo.includes("medalha desbloqueada") ||
    titulo.includes("medalha")
  );
}

function notificacaoEhCadastro(item: AnyRecord) {
  const tipo = tipoEventoNotificacao(item);
  const titulo = normalizar(
    item?.titulo || item?.descricao || item?.mensagem || item?.texto,
  );
  const metadata = metadataNotificacao(item);
  const categoria = normalizar(
    metadata?.tipo || metadata?.categoria || metadata?.evento,
  );

  return (
    tipo.includes("cadastro") ||
    tipo.includes("usuario_novo") ||
    tipo.includes("novo_usuario") ||
    categoria.includes("cadastro") ||
    titulo.includes("chegou a comunidade") ||
    titulo.includes("chegou à comunidade") ||
    titulo.includes("novo aventureiro") ||
    titulo.includes("novo navegador") ||
    titulo.includes("nova pessoa") ||
    titulo.includes("entrou na comunidade")
  );
}

function tituloRoteiroNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);

  return primeiroTextoSemRotaRoteiro(
    item?.roteiro_titulo,
    item?.nome_roteiro,
    item?.titulo_roteiro,
    item?.roteiro_nome,
    metadata?.roteiro_titulo,
    metadata?.nome_roteiro,
    metadata?.titulo_roteiro,
    metadata?.roteiro_nome,
  );
}

function localNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);

  return primeiroTextoSemRotaRoteiro(
    item?.roteiro_local,
    item?.local_roteiro,
    item?.localizacao,
    item?.local,
    item?.cidade,
    item?.ponto_encontro,
    metadata?.roteiro_local,
    metadata?.local_roteiro,
    metadata?.localizacao,
    metadata?.local,
    metadata?.cidade,
    metadata?.ponto_encontro,
  );
}

function extrairCidadeOuLocalDoTexto(valor: unknown) {
  const raw = texto(valor);
  if (!raw) return "";

  if (valorPareceRotaRoteiro(raw)) return "";

  const semPrefixo = raw
    .replace(/^local\s*:\s*/i, "")
    .replace(/\.\s*toque.*$/i, "")
    .trim();

  if (valorPareceRotaRoteiro(semPrefixo)) return "";

  const separadores = [" · ", " - ", " — ", " – "];

  for (const separador of separadores) {
    if (semPrefixo.includes(separador)) {
      const partes = semPrefixo
        .split(separador)
        .map((parte) => texto(parte))
        .filter(Boolean);

      if (partes.length > 1) {
        return partes[partes.length - 1];
      }
    }
  }

  return semPrefixo;
}

function extrairTituloRoteiroDoTexto(valor: unknown) {
  const raw = texto(valor);
  if (!raw || valorPareceRotaRoteiro(raw)) return "";

  const partes = raw
    .split(/ · | - | — | – /)
    .map((parte) => texto(parte))
    .filter(Boolean);

  if (partes.length > 1) return partes[0];

  if (normalizar(raw).includes("toque para abrir")) return "";

  return raw;
}

function localOuCidadeNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);

  return primeiroTextoSemRotaRoteiro(
    localNotificacao(item),
    metadata?.cidade,
    metadata?.local,
    extrairCidadeOuLocalDoTexto(item?.texto),
    extrairCidadeOuLocalDoTexto(item?.mensagem),
    extrairCidadeOuLocalDoTexto(item?.descricao),
  );
}

function nomeMedalhaNotificacao(item: AnyRecord) {
  const metadata = metadataNotificacao(item);

  return texto(
    item?.nome_medalha ||
      item?.medalha_nome ||
      item?.conquista_nome ||
      metadata?.nome_medalha ||
      metadata?.medalha_nome ||
      metadata?.conquista_nome,
  );
}

function tituloRoteiroAll(item: AnyRecord) {
  const local = textoSemRotaRoteiro(localOuCidadeNotificacao(item));
  if (local) return `Novo roteiro: ${local}`;

  const roteiro = textoSemRotaRoteiro(tituloRoteiroNotificacao(item));
  if (roteiro) return `Novo roteiro: ${roteiro}`;

  const tituloOriginal = valorPareceRotaRoteiro(item?.titulo) ? "" : texto(item?.titulo);
  const tituloNormalizado = normalizar(tituloOriginal);

  if (tituloNormalizado.startsWith("novo roteiro")) {
    const depois = texto(tituloOriginal.split(":").slice(1).join(":"));
    if (depois && !valorPareceRotaRoteiro(depois) && normalizar(depois) !== "um novo roteiro")
      return `Novo roteiro: ${depois}`;
  }

  if (tituloNormalizado.includes("publicou")) {
    const partes = tituloOriginal.split(/publicou/i);
    const depois = texto(partes[1])
      .replace(/^um\s+novo\s+roteiro\.?$/i, "")
      .replace(/^um\s+roteiro\.?$/i, "")
      .trim();

    if (depois && !valorPareceRotaRoteiro(depois)) {
      return `Novo roteiro: ${depois.replace(/^o\s+/i, "")}`;
    }
  }

  return "Novo roteiro publicado";
}

function textoRoteiroAll(item: AnyRecord) {
  const roteiro =
    tituloRoteiroNotificacao(item) ||
    extrairTituloRoteiroDoTexto(item?.texto) ||
    extrairTituloRoteiroDoTexto(item?.mensagem) ||
    extrairTituloRoteiroDoTexto(item?.descricao);
  const local = textoSemRotaRoteiro(localOuCidadeNotificacao(item));

  if (roteiro && !valorPareceRotaRoteiro(roteiro)) {
    return `${roteiro}. Toque para abrir o roteiro.`;
  }

  if (local && !valorPareceRotaRoteiro(local)) {
    return `Experiência em ${local}. Toque para abrir o roteiro.`;
  }

  return "Toque para abrir o roteiro publicado.";
}

function normalizarRoteiroComParaAll(
  item: Notificacao,
  index: number,
): Notificacao {
  const local = textoSemRotaRoteiro(localOuCidadeNotificacao(item as unknown as AnyRecord));
  const roteiro = textoSemRotaRoteiro(extrairTituloRoteiroDoTexto(item.texto));

  return {
    id: `${texto(item.id) || `roteiro-com-${index}`}-all`,
    titulo: local
      ? `Novo roteiro: ${local}`
      : tituloRoteiroAll(item as unknown as AnyRecord),
    texto: roteiro
      ? `${roteiro}. Toque para abrir o roteiro.`
      : "Toque para abrir o roteiro publicado.",
    destino: item.destino || "/roteiros",
    emoji: "🧭",
    tipo: "all",
    tipoEvento: item.tipoEvento || "roteiro",
    created_at: item.created_at || null,
  };
}

function normalizarNotificacaoAll(item: AnyRecord, index: number): Notificacao {
  const tipo = tipoEventoNotificacao(item);
  const isRoteiro = notificacaoEhRoteiro(item);
  const isReserva = notificacaoEhReserva(item);
  const isConquista = notificacaoEhConquista(item);
  const isCadastro = notificacaoEhCadastro(item);

  let titulo = "Movimento na comunidade";
  let corpo = "A comunidade PrussikTrails teve uma nova movimentação.";
  let emoji = "🌿";
  let destino = "/cliente/dashboard";

  if (isRoteiro) {
    titulo = tituloRoteiroAll(item);
    corpo = textoRoteiroAll(item);
    emoji = "🧭";
    destino = destinoNotificacao(item, "/roteiros");
  } else if (isReserva) {
    titulo = "Reserva feita";
    corpo = "Uma nova reserva foi realizada no PrussikTrails.";
    emoji = "🎟️";
  } else if (isConquista) {
    const medalha = nomeMedalhaNotificacao(item);
    titulo = "Conquista desbloqueada";
    corpo = medalha || "Uma nova conquista apareceu na comunidade.";
    emoji = "🏅";
    destino = destinoPerfilQuemFez(item, "/cliente/dashboard");
  } else if (isCadastro) {
    const tipoCadastro = normalizar(
      item?.tipo_usuario ||
        item?.usuario_tipo ||
        metadataNotificacao(item)?.tipo_usuario,
    );
    titulo = tipoCadastro.includes("guia")
      ? "Novo guia na comunidade"
      : "Novo aventureiro na comunidade";
    corpo = tipoCadastro.includes("guia")
      ? "Um novo guia entrou no PrussikTrails."
      : "Alguém começou sua jornada no PrussikTrails.";
    emoji = tipoCadastro.includes("guia") ? "🥾" : "🌿";
  } else if (tipo.includes("guia")) {
    titulo = "Movimento de guia na comunidade";
    corpo = "Um guia movimentou a comunidade PrussikTrails.";
    emoji = "🥾";
  }

  if (isRoteiro && valorPareceRotaRoteiro(titulo)) {
    titulo = "Novo roteiro publicado";
  }

  return {
    id: texto(item?.id) || `all-${index}-${Date.now()}`,
    titulo,
    texto: corpo,
    destino,
    emoji,
    tipo: "all",
    tipoEvento: tipo,
    created_at:
      texto(item?.created_at || item?.criado_em || item?.data) || null,
  };
}

function normalizarNotificacaoCom(item: AnyRecord, index: number): Notificacao {
  const tipo = tipoEventoNotificacao(item);
  const nome = nomePessoaNotificacao(item);
  const isRoteiro = notificacaoEhRoteiro(item);
  const roteiro = tituloRoteiroNotificacao(item);
  const local = localOuCidadeNotificacao(item);

  let titulo = "Interação na COM";
  let corpo = texto(item?.texto || item?.mensagem || item?.descricao);
  if (valorPareceRotaRoteiro(corpo)) corpo = "";

  if (isRoteiro) {
    titulo = nome
      ? `${nome} publicou um novo roteiro`
      : "Guia que você segue publicou um novo roteiro";

    if (!corpo) {
      if (roteiro && local && normalizar(roteiro) !== normalizar(local)) {
        corpo = `${roteiro} · ${local}`;
      } else {
        corpo = roteiro || local || "Toque para abrir o roteiro.";
      }
    }
  } else {
    titulo =
      texto(item?.titulo) ||
      (nome ? `${nome} interagiu com você` : "Interação na COM");
    corpo = corpo || "Toque para abrir os detalhes.";
  }

  return {
    id: texto(item?.id) || `com-${index}-${Date.now()}`,
    titulo,
    texto: corpo,
    destino: destinoNotificacao(item, "/roteiros"),
    emoji: isRoteiro
      ? "🧭"
      : tipo.includes("seguir")
        ? "👣"
        : tipo.includes("curtida")
          ? "❤️"
          : "💬",
    tipo: "com",
    tipoEvento: tipo,
    created_at:
      texto(item?.created_at || item?.criado_em || item?.data) || null,
  };
}

function compararDataDesc(a: Notificacao, b: Notificacao) {
  const dataA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const dataB = b.created_at ? new Date(b.created_at).getTime() : 0;
  return dataB - dataA;
}

function mesclarNotificacoes(listas: Notificacao[][]) {
  const mapa = new Map<string, Notificacao>();

  listas.flat().forEach((item) => {
    const chave = `${item.destino || ""}|${normalizar(item.titulo)}|${item.created_at || ""}`;
    if (!mapa.has(chave)) mapa.set(chave, item);
  });

  return Array.from(mapa.values()).sort(compararDataDesc).slice(0, 12);
}

function roteiroPublicado(roteiro: AnyRecord) {
  if (roteiro.ativo === false) return false;
  if (roteiro.aprovado === true) return true;

  const status = normalizar(
    roteiro.status || roteiro.situacao || roteiro.publicacao || roteiro.estado,
  );
  if (!status) return true;

  return [
    "ativo",
    "aprovado",
    "aprovada",
    "publicado",
    "publicada",
    "confirmado",
    "confirmada",
  ].includes(status);
}

export default function ClienteDashboardPage() {
  const router = useRouter();
  const iniciouRef = useRef(false);
  const ultimaCargaRef = useRef(0);

  const [user, setUser] = useState<UsuarioLocal | null>(null);
  const [stats, setStats] = useState<Stats>(statsInicial);
  const [roteirosQuentes, setRoteirosQuentes] = useState<Roteiro[]>([]);
  const [activeHotTrail, setActiveHotTrail] = useState(0);
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([]);
  const [ultimaMedalha, setUltimaMedalha] = useState<MedalhaResumo | null>(null);
  const [notificacoesAll, setNotificacoesAll] = useState<Notificacao[]>([]);
  const [notificacoesCom, setNotificacoesCom] = useState<Notificacao[]>([]);
  const [abaNotificacoes, setAbaNotificacoes] = useState<"all" | "com">("all");
  const [atualizando, setAtualizando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");

  useEffect(() => {
    if (iniciouRef.current) return;
    iniciouRef.current = true;
    iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    router.prefetch("/cliente/perfil");
    router.prefetch("/cliente/minhas-reservas");
    router.prefetch("/roteiros");
  }, [router]);

  useEffect(() => {
    const userIdSeguro = texto(user?.id);
    if (!userIdSeguro) return;

    function atualizarAoVoltarParaTela() {
      const agora = Date.now();
      const passouTempoMinimo = agora - ultimaCargaRef.current > 25000;

      if (document.visibilityState === "visible" && passouTempoMinimo) {
        carregarResumo(userIdSeguro, true);
      }
    }

    window.addEventListener("focus", atualizarAoVoltarParaTela);
    document.addEventListener("visibilitychange", atualizarAoVoltarParaTela);

    return () => {
      window.removeEventListener("focus", atualizarAoVoltarParaTela);
      document.removeEventListener("visibilitychange", atualizarAoVoltarParaTela);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (roteirosQuentes.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveHotTrail((prev) => (prev + 1) % roteirosQuentes.length);
    }, 4300);
    return () => window.clearInterval(timer);
  }, [roteirosQuentes.length]);

  const notificacoesVisiveis = useMemo(() => {
    const lista = abaNotificacoes === "all" ? notificacoesAll : notificacoesCom;
    if (lista.length === 0)
      return [
        abaNotificacoes === "all" ? notificacaoVaziaAll : notificacaoVaziaCom,
      ];
    return lista.slice(0, LIMITE_NOTIFICACOES_CARD);
  }, [abaNotificacoes, notificacoesAll, notificacoesCom]);

  const roteiroAtivo = useMemo(() => {
    return roteirosQuentes[activeHotTrail] || roteirosQuentes[0] || null;
  }, [roteirosQuentes, activeHotTrail]);

  const avatar = avatarUsuario(user);
  const nome = nomeUsuario(user);

  async function iniciar() {
    try {
      const salvo = localStorage.getItem("user");
      const parsedUser = salvo ? (JSON.parse(salvo) as UsuarioLocal) : null;

      if (!parsedUser?.id || normalizar(parsedUser.tipo) !== "cliente") {
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
      await carregarResumo(parsedUser.id);
    } catch (error) {
      console.error("Erro ao iniciar dashboard do cliente:", error);
      setMensagem("Não foi possível carregar sua dashboard agora.");
    }
  }

  async function carregarRoteirosPublicosFallback(): Promise<Roteiro[]> {
    const { data, error } = await supabase
      .from("roteiros")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(18);

    if (error) {
      console.warn("Não foi possível carregar roteiros públicos:", error);
      return [];
    }

    return ((data || []) as AnyRecord[])
      .filter(roteiroPublicado)
      .slice(0, 6) as Roteiro[];
  }

  async function carregarNotificacoesCom(
    usuarioId: string,
  ): Promise<Notificacao[]> {
    if (!usuarioId) return [];

    try {
      const response = await fetch(
        `/api/notificacoes/com?usuarioId=${encodeURIComponent(usuarioId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.sucesso === false) return [];

      const lista: AnyRecord[] = Array.isArray(data?.notificacoes)
        ? data.notificacoes
        : [];
      return lista
        .map((item, index) => normalizarNotificacaoCom(item, index))
        .sort(compararDataDesc)
        .slice(0, 12);
    } catch (error) {
      console.warn("Erro ao carregar notificações COM:", error);
      return [];
    }
  }

  async function carregarEstatisticasCliente(clienteId: string) {
    if (!clienteId) return null;

    try {
      const response = await fetch(
        `/api/cliente/estatisticas?clienteId=${encodeURIComponent(clienteId)}&userId=${encodeURIComponent(clienteId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.sucesso === false) return null;

      return data as AnyRecord;
    } catch (error) {
      console.warn("Não foi possível carregar estatísticas complementares do cliente:", error);
      return null;
    }
  }

  async function carregarResumo(clienteId: string, silencioso = false) {
    if (!clienteId) return;

    if (!silencioso) {
      setAtualizando(true);
      setMensagem("");
    }

    try {
      const response = await fetch(
        `/api/cliente/dashboard/resumo?clienteId=${encodeURIComponent(clienteId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok || data?.sucesso === false)
        throw new Error(data?.erro || "Erro ao carregar resumo da dashboard.");

      if (data?.usuario?.id) {
        const usuarioAtualizado: UsuarioLocal = {
          id: data.usuario.id,
          nome: data.usuario.nome || "",
          email: data.usuario.email || "",
          tipo: data.usuario.tipo || "cliente",
          avatar_url: data.usuario.avatar_url || null,
          foto_url: data.usuario.foto_url || null,
          imagem_url: data.usuario.imagem_url || null,
        };
        setUser(usuarioAtualizado);
        localStorage.setItem("user", JSON.stringify(usuarioAtualizado));
      }

      const roteirosDashboard = Array.isArray(data?.roteirosQuentes)
        ? data.roteirosQuentes
        : [];
      const roteirosFallback =
        roteirosDashboard.length > 0
          ? []
          : await carregarRoteirosPublicosFallback();
      setRoteirosQuentes(
        (roteirosDashboard.length > 0
          ? roteirosDashboard
          : roteirosFallback) as Roteiro[],
      );
      setActiveHotTrail(0);

      const statsResumo = normalizarStatsDashboard(data || {});
      const estatisticasComplementares = await carregarEstatisticasCliente(
        data?.usuario?.id || clienteId,
      );
      setStats(mesclarStats(statsResumo, estatisticasComplementares));
      setUltimaMedalha(extrairUltimaMedalha(data || {}));
      setProximasReservas(
        Array.isArray(data?.proximasReservas) ? data.proximasReservas : [],
      );
      setUltimaAtualizacao(
        data?.ultimaAtualizacao || new Date().toLocaleTimeString("pt-BR"),
      );
      ultimaCargaRef.current = Date.now();

      const notificacoesBase: AnyRecord[] = Array.isArray(data?.notificacoes)
        ? data.notificacoes
        : [];

      const listaComSemMapa = await carregarNotificacoesCom(
        data?.usuario?.id || clienteId,
      );

      const idsRoteirosNotificacoes = Array.from(
        new Set(
          [
            ...notificacoesBase.map((item) => idRoteiroNotificacao(item)),
            ...listaComSemMapa.map((item) => extrairRoteiroIdDeValor(item.destino)),
          ].filter(Boolean),
        ),
      );

      const mapaRoteirosNotificacoes = await buscarMapaRoteirosPorIds(idsRoteirosNotificacoes);

      const notificacoesGerais = notificacoesBase
        .map((item) => enriquecerItemComRoteiro(item, mapaRoteirosNotificacoes))
        .filter(
          (item) =>
            normalizar(item?.tipo) !== "com" || notificacaoEhRoteiro(item),
        )
        .map((item, index) => normalizarNotificacaoAll(item, index))
        .sort(compararDataDesc)
        .slice(0, 12);

      const listaCom = listaComSemMapa
        .map((item) => enriquecerNotificacaoComRoteiro(item, mapaRoteirosNotificacoes))
        .sort(compararDataDesc)
        .slice(0, 12);

      setNotificacoesCom(listaCom.slice(0, LIMITE_NOTIFICACOES_CARD));

      const roteirosDaComNoAll = listaCom
        .filter(
          (item) =>
            normalizar(item.tipoEvento).includes("roteiro") ||
            normalizar(item.titulo).includes("roteiro") ||
            texto(item.destino).startsWith("/roteiros/"),
        )
        .map((item, index) => normalizarRoteiroComParaAll(item, index));

      setNotificacoesAll(
        mesclarNotificacoes([roteirosDaComNoAll, notificacoesGerais]).slice(0, LIMITE_NOTIFICACOES_CARD),
      );
    } catch (error) {
      console.error("Erro ao carregar resumo da dashboard:", error);
      if (!silencioso)
        setMensagem(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar os dados agora.",
        );
    } finally {
      if (!silencioso) setAtualizando(false);
    }
  }

  function definirAbaNotificacoes(aba: "all" | "com") {
    setAbaNotificacoes(aba);
    try {
      localStorage.setItem("cliente_dashboard_notificacoes_aba", aba);
    } catch {}
  }

  function abrirDestino(destino?: string) {
    router.push(texto(destino) || "/cliente/dashboard");
  }

  if (!user) {
    return (
      <main className="loadingPage">
        <style>{styles}</style>
        <div className="loadingCard">Carregando sua dashboard...</div>
      </main>
    );
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="topbar">
        <div className="topbarInner">
          <button
            type="button"
            className="brandName"
            onClick={() => router.push("/cliente/dashboard")}
            aria-label="Dashboard do cliente PrussikTrails"
          >
            <strong>PrussikTrails</strong>
            <span>Passaporte do aventureiro</span>
          </button>

          <button
            type="button"
            className="avatarMini"
            onClick={() => router.push("/cliente/perfil")}
            aria-label="Abrir perfil"
          >
            {avatar ? (
              <img src={avatar} alt={nome} />
            ) : (
              <span>{nome.charAt(0).toUpperCase()}</span>
            )}
          </button>
        </div>
      </header>

      <section className="shell">
        <section className="hero">
          <div className="heroText">
            <div className="eyebrow">Passaporte do aventureiro</div>
            <h1>Olá, {nome.split(" ")[0] || "aventureiro"}. A próxima história começa fora da tela.</h1>
            <p>
              Escolha o roteiro, reserve sua vaga e acompanhe sua jornada, conquistas
              e movimentos da comunidade outdoor. A sua próxima aventura começa aqui.
            </p>
          </div>

          <aside
            className="homeHotCard"
            role="button"
            tabIndex={0}
            onClick={() => router.push("/roteiros")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/roteiros");
              }
            }}
            aria-label="Abrir página de roteiros"
          >
            {!roteiroAtivo ? (
              <div className="emptyHot">
                Assim que novos roteiros forem aprovados, eles aparecerão aqui.
              </div>
            ) : (
              <div
                className="homeHotVisual"
                style={
                  {
                    "--hot-image": fotoRoteiro(roteiroAtivo)
                      ? `url("${fotoRoteiro(roteiroAtivo)}")`
                      : "radial-gradient(circle at 80% 10%, rgba(190,242,100,0.24), transparent 34%), linear-gradient(135deg, #203c2e 0%, #5f7547 48%, #d7c6a1 100%)",
                  } as CSSProperties
                }
              >
                <div className="hotTop">
                  <div className="hotBadge">Roteiro em destaque</div>
                  <div className="hotCounter">
                    {String(activeHotTrail + 1).padStart(2, "0")} /{" "}
                    {String(roteirosQuentes.length || 1).padStart(2, "0")}
                  </div>
                </div>

                <div className="hotContent">
                  <h2>{tituloRoteiro(roteiroAtivo)}</h2>
                  <div className="hotMeta">
                    <div>
                      <strong>Local:</strong> {localRoteiro(roteiroAtivo)}
                    </div>
                    <div>
                      <strong>Nível:</strong>{" "}
                      {roteiroAtivo.dificuldade || "Nível informado pelo guia"}
                    </div>
                    <div>
                      <strong>Valor:</strong>{" "}
                      {precoRoteiro(roteiroAtivo) > 0
                        ? formatarMoeda(precoRoteiro(roteiroAtivo))
                        : "Consulte no app"}
                    </div>
                  </div>

                  <div className="hotClickHint">
                    Clique no card para ver todos os roteiros disponíveis.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>

        {mensagem && <div className="notice">{mensagem}</div>}

        <section className="statsGrid">
          <article className="statsJourneyCard">
            <span>Jornada realizada</span>
            <div className="journeySplit">
              <strong>{formatarKm(stats.totalKm)} km</strong>
              <strong>{stats.totalTrilhas} trilhas</strong>
            </div>
            <small className="metricHint">Conta apenas roteiros finalizados como realizados.</small>
          </article>

          <article
            className="statsReservationsCard"
            role="button"
            tabIndex={0}
            onClick={() => router.push("/cliente/minhas-reservas")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/cliente/minhas-reservas");
              }
            }}
            aria-label="Abrir minhas reservas"
          >
            <span>Reservas</span>
            <div className="reservationStatsSplit">
              <strong>{stats.reservasConfirmadas}</strong>
              <strong>{stats.reservasRealizadas}</strong>
              <strong>{stats.reservasPendentes}</strong>
            </div>
            <div className="reservationStatsLabels">
              <small>pagas</small>
              <small>realizadas</small>
              <small>pendentes</small>
            </div>
          </article>

          <article
            className="statsMedalCard"
            role="button"
            tabIndex={0}
            onClick={() => router.push("/cliente/perfil")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/cliente/perfil");
              }
            }}
            aria-label="Abrir medalhas e conquistas"
          >
            <div className="medalStatContent">
              <div className="medalStatText">
                <span>Conquistas</span>
                <strong>{stats.totalMedalhas}</strong>
                <small>
                  {ultimaMedalha
                    ? `Última medalha: ${nomeMedalhaResumo(ultimaMedalha)}`
                    : "Sua próxima medalha aparece aqui."}
                </small>
              </div>

              <div className="lastMedalPreview" aria-hidden="true">
                {imagemMedalhaResumo(ultimaMedalha) ? (
                  <img src={imagemMedalhaResumo(ultimaMedalha)} alt="" />
                ) : (
                  <b>🏅</b>
                )}
              </div>
            </div>

            {ultimaMedalha && dataMedalhaResumo(ultimaMedalha) && (
              <em className="medalUnlockedAt">
                Desbloqueada em {formatarDataHora(dataMedalhaResumo(ultimaMedalha))}
              </em>
            )}
          </article>

          <article
            className="statsProfileCard"
            role="button"
            tabIndex={0}
            onClick={() => router.push("/cliente/perfil")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/cliente/perfil");
              }
            }}
            aria-label="Abrir perfil do cliente"
          >
            <div className="profileStatContent">
              <div className="profileStatAvatar">
                {avatar ? <img src={avatar} alt={nome} /> : <b>{nome.charAt(0).toUpperCase()}</b>}
              </div>

              <div className="profileStatText">
                <span>Perfil</span>
                <strong>Meu perfil</strong>
                <small>Ver passaporte</small>
              </div>
            </div>
          </article>
        </section>

        <section className="mainGrid">
          <section className="panel notificationsPanel">
            <div className="panelHeader">
              <div>
                <h2>Notificações</h2>
                <p>
                  ALL mostra a comunidade. COM mostra interações relacionadas a
                  você e aos guias que você segue.
                </p>
              </div>
              <button
                type="button"
                className="smallButton"
                onClick={() => carregarResumo(user.id)}
                disabled={atualizando}
              >
                {atualizando ? "Atualizando..." : "Atualizar"}
              </button>
            </div>

            <div className="tabs">
              <button
                type="button"
                className={abaNotificacoes === "all" ? "active" : ""}
                onClick={() => definirAbaNotificacoes("all")}
              >
                ALL <span>{notificacoesAll.length}</span>
              </button>
              <button
                type="button"
                className={abaNotificacoes === "com" ? "active" : ""}
                onClick={() => definirAbaNotificacoes("com")}
              >
                COM <span>{notificacoesCom.length}</span>
              </button>
            </div>

            <div className="notificationsList">
              {notificacoesVisiveis.map((notificacao) => (
                <button
                  type="button"
                  key={notificacao.id}
                  className={`notificationItem ${notificacao.id.startsWith("empty") ? "emptyNotification" : ""}`}
                  onClick={() => abrirDestino(notificacao.destino)}
                >
                  <span className="notificationEmoji">{notificacao.emoji}</span>
                  <span className="notificationContent">
                    <strong>{notificacao.titulo}</strong>
                    <small>{notificacao.texto}</small>
                    {notificacao.created_at && (
                      <em>{formatarDataHora(notificacao.created_at)}</em>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <aside
            className="panel reservasPanel"
            role="button"
            tabIndex={0}
            onClick={() => router.push("/cliente/minhas-reservas")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/cliente/minhas-reservas");
              }
            }}
            aria-label="Abrir minhas reservas"
          >
            <div className="panelHeader compact">
              <div>
                <h2>Minhas reservas</h2>
                <p>Pagas: {stats.reservasConfirmadas} · Realizadas: {stats.reservasRealizadas} · Pendentes: {stats.reservasPendentes}</p>
              </div>
            </div>

            {proximasReservas.length === 0 ? (
              <div className="emptyBox">
                Você ainda não tem reservas futuras.
              </div>
            ) : (
              <div className="reservationList">
                {proximasReservas.slice(0, 4).map((reserva) => (
                  <button
                    type="button"
                    key={reserva.id}
                    onClick={() => router.push("/cliente/minhas-reservas")}
                  >
                    {reserva.roteiro_foto || fotoRoteiro(reserva.roteiro) ? (
                      <img
                        src={
                          reserva.roteiro_foto || fotoRoteiro(reserva.roteiro)
                        }
                        alt={
                          reserva.roteiro_titulo ||
                          tituloRoteiro(reserva.roteiro)
                        }
                      />
                    ) : (
                      <span>🎟️</span>
                    )}
                    <span>
                      <strong>
                        {reserva.roteiro_titulo ||
                          tituloRoteiro(reserva.roteiro)}
                      </strong>
                      <small>
                        {formatarDataHora(
                          reserva.data_trilha ||
                            reserva.data_roteiro ||
                            reserva.created_at,
                        )}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f7f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button { font: inherit; }
  .page, .loadingPage { min-height: 100vh; min-height: 100dvh; color: #172018; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,0.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251,146,60,0.14), transparent 28%), linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%); }
  .loadingPage { display: grid; place-items: center; padding: 20px; }
  .loadingCard { border-radius: 28px; background: rgba(255,255,255,0.88); border: 1px solid rgba(15,23,42,0.08); padding: 28px; box-shadow: 0 22px 60px rgba(15,23,42,0.12); color: #203c2e; font-weight: 950; }
  .topbar { position: sticky; top: 0; z-index: 60; background: rgba(255,253,247,0.90); border-bottom: 1px solid rgba(15,23,42,0.06); backdrop-filter: blur(18px); padding: 8px 14px; }
  .topbarInner { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
  .brandName { grid-column: 2; justify-self: center; border: 0; background: transparent; padding: 0; cursor: pointer; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 0; max-width: min(520px, calc(100vw - 124px)); text-align: center; color: #203c2e; }
  .brandName strong { display: block; color: #203c2e; font-size: clamp(25px, 4.2vw, 42px); line-height: 0.92; font-weight: 950; letter-spacing: -0.075em; white-space: nowrap; }
  .brandName span { display: block; color: #7b8372; font-size: clamp(8px, 1.05vw, 12px); line-height: 1; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; }
  .avatarMini { grid-column: 3; justify-self: end; width: 42px; height: 42px; border-radius: 999px; border: 1px solid rgba(15,23,42,0.08); background: rgba(255,255,255,0.88); box-shadow: 0 10px 22px rgba(15,23,42,0.06); cursor: pointer; padding: 0; overflow: hidden; }
  .avatarMini img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .avatarMini span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #203c2e; color: #fffdf7; font-weight: 950; }
  .shell { max-width: 1180px; margin: 0 auto; padding: 22px 16px 54px; }
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(310px, 420px); gap: 18px; align-items: stretch; margin-bottom: 16px; }
  .heroText { border-radius: 36px; padding: 30px; color: #fff; background: linear-gradient(135deg, rgba(23,32,24,0.82), rgba(23,32,24,0.46)), radial-gradient(circle at top right, rgba(190,242,100,0.30), transparent 34%), linear-gradient(135deg, #1f331f 0%, #647a49 46%, #d7c6a1 100%); box-shadow: 0 24px 60px rgba(23,32,24,0.18); }
  .eyebrow { display: inline-flex; width: fit-content; border-radius: 999px; border: 1px solid rgba(255,255,255,0.24); background: rgba(255,255,255,0.12); color: #f7fee7; padding: 8px 12px; font-size: 11px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
  .heroText h1 { margin: 0; font-size: clamp(44px, 6vw, 76px); line-height: 0.92; font-weight: 950; letter-spacing: -0.085em; }
  .heroText p { max-width: 760px; margin: 14px 0 0; color: rgba(255,255,255,0.82); line-height: 1.6; font-size: 14px; font-weight: 650; }
  .homeHotCard { border-radius: 34px; overflow: hidden; min-height: 360px; background: linear-gradient(135deg, #172018 0%, #253f2c 52%, #6f7f4f 100%); box-shadow: 0 24px 60px rgba(23,32,24,0.18); color: #fff; cursor: pointer; outline: none; transition: transform .18s ease, box-shadow .18s ease; }
  .homeHotCard:hover, .homeHotCard:focus-visible { transform: translateY(-2px); box-shadow: 0 30px 72px rgba(23,32,24,0.23); }
  .homeHotVisual { min-height: 360px; height: 100%; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, rgba(23,32,24,0.74), rgba(23,32,24,0.38)), var(--hot-image); background-size: cover; background-position: center; }
  .emptyHot { height: 100%; min-height: 320px; display: grid; place-items: center; padding: 20px; text-align: center; color: rgba(255,255,255,0.78); font-weight: 850; }
  .hotTop { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .hotBadge { width: fit-content; border-radius: 999px; padding: 8px 11px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.20); color: #f7fee7; font-size: 11px; font-weight: 950; letter-spacing: 0.10em; text-transform: uppercase; backdrop-filter: blur(12px); }
  .hotCounter { color: rgba(255,255,255,0.72); font-size: 12px; font-weight: 900; }
  .hotContent { display: grid; gap: 12px; }
  .hotContent h2 { margin: 0; color: #fff; font-size: 31px; line-height: 0.96; font-weight: 950; letter-spacing: -0.065em; }
  .hotMeta { display: grid; gap: 7px; color: rgba(255,255,255,0.82); font-size: 13px; line-height: 1.42; font-weight: 800; }
  .hotMeta strong { color: #fff; }
  .hotClickHint { width: fit-content; border-radius: 999px; padding: 10px 13px; background: rgba(190,242,100,0.92); color: #172018; font-size: 12px; line-height: 1.2; font-weight: 950; box-shadow: 0 14px 30px rgba(15,23,42,0.16); }
  .notice { border-radius: 18px; padding: 13px 15px; margin-bottom: 16px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 13px; font-weight: 850; }
  .statsGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
  .statsGrid article, .panel { background: rgba(255,255,255,0.90); border: 1px solid rgba(15,23,42,0.06); box-shadow: 0 12px 34px rgba(15,23,42,0.06); }
  .statsGrid article { border-radius: 24px; padding: 16px; min-height: 88px; }
  .statsGrid span { display: block; color: #64748b; font-size: 10px; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
  .statsGrid strong { color: #172018; font-size: 20px; line-height: 1; font-weight: 950; letter-spacing: -0.05em; }
  .statsJourneyCard { background: radial-gradient(circle at 100% 0%, rgba(132,204,22,0.14), transparent 42%), rgba(255,255,255,0.92) !important; }
  .journeySplit { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: end; }
  .journeySplit strong { display: block; white-space: nowrap; }
  .metricHint { display: block; margin-top: 9px; color: #7b8372; font-size: 10px; line-height: 1.25; font-weight: 850; text-transform: none; letter-spacing: 0; }
  .statsReservationsCard { cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; background: radial-gradient(circle at 100% 0%, rgba(34,197,94,0.14), transparent 42%), rgba(255,255,255,0.92) !important; }
  .statsReservationsCard:hover, .statsReservationsCard:focus-visible { transform: translateY(-2px); border-color: rgba(32,60,46,0.16); box-shadow: 0 18px 42px rgba(15,23,42,0.10); outline: none; }
  .reservationStatsSplit { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; align-items: end; }
  .reservationStatsSplit strong { display: block; font-size: 22px; text-align: center; }
  .reservationStatsLabels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 7px; }
  .reservationStatsLabels small { display: block; color: #64748b; font-size: 9px; line-height: 1.15; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }
  .statsProfileCard { cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; background: radial-gradient(circle at 100% 0%, rgba(251,146,60,0.13), transparent 42%), rgba(255,255,255,0.92) !important; }
  .statsProfileCard:hover, .statsProfileCard:focus-visible { transform: translateY(-2px); border-color: rgba(32,60,46,0.16); box-shadow: 0 18px 42px rgba(15,23,42,0.10); outline: none; }
  .statsMedalCard { cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; background: radial-gradient(circle at 88% 4%, rgba(212,179,90,0.22), transparent 42%), rgba(255,255,255,0.94) !important; overflow: hidden; }
  .statsMedalCard:hover, .statsMedalCard:focus-visible { transform: translateY(-2px); border-color: rgba(212,179,90,0.30); box-shadow: 0 18px 42px rgba(15,23,42,0.10); outline: none; }
  .medalStatContent { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-width: 0; }
  .medalStatText { min-width: 0; }
  .medalStatText strong { display: block; font-size: 24px; }
  .medalStatText small { display: block; margin-top: 6px; color: #64748b; font-size: 11px; line-height: 1.28; font-weight: 850; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .lastMedalPreview { width: 58px; height: 58px; flex: 0 0 auto; border-radius: 20px; background: radial-gradient(circle at 50% 32%, rgba(212,179,90,0.24), transparent 54%), #fffdf7; border: 1px solid rgba(212,179,90,0.20); display: flex; align-items: center; justify-content: center; box-shadow: 0 14px 32px rgba(32,60,46,0.10); overflow: hidden; }
  .lastMedalPreview img { width: 78%; height: 78%; object-fit: contain; display: block; filter: drop-shadow(0 10px 16px rgba(15,23,42,0.16)); }
  .lastMedalPreview b { font-size: 28px; }
  .medalUnlockedAt { display: block; margin-top: 9px; color: #9a7b2f; font-size: 10px; line-height: 1.2; font-style: normal; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
  .profileStatContent { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .profileStatAvatar { width: 46px; height: 46px; border-radius: 999px; flex: 0 0 auto; overflow: hidden; background: #203c2e; color: #fffdf7; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 22px rgba(15,23,42,0.08); }
  .profileStatAvatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .profileStatAvatar b { font-size: 17px; font-weight: 950; }
  .profileStatText { min-width: 0; }
  .profileStatText strong { display: block; }
  .profileStatText small { display: block; margin-top: 5px; color: #64748b; font-size: 11px; line-height: 1.2; font-weight: 850; }
  .mainGrid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .panel { border-radius: 30px; padding: 18px; overflow: hidden; }
  .reservasPanel { cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .reservasPanel:hover, .reservasPanel:focus-visible { transform: translateY(-2px); border-color: rgba(32,60,46,0.16); box-shadow: 0 18px 42px rgba(15,23,42,0.10); outline: none; }
  .panelHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 15px; flex-wrap: wrap; }
  .panelHeader h2 { margin: 0; color: #172018; font-size: 23px; line-height: 1; font-weight: 950; letter-spacing: -0.055em; }
  .panelHeader p { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; max-width: 560px; }
  .smallButton { border: 0; border-radius: 999px; padding: 10px 13px; background: #eef2e5; color: #203c2e; cursor: pointer; font-size: 12px; font-weight: 950; }
  .tabs { display: flex; gap: 8px; padding: 5px; background: #eef2e5; border-radius: 999px; width: fit-content; margin-bottom: 14px; }
  .tabs button { border: 0; border-radius: 999px; padding: 9px 12px; background: transparent; color: #64748b; cursor: pointer; font-size: 12px; font-weight: 950; }
  .tabs button.active { background: #172018; color: #fffdf7; }
  .tabs span { min-width: 20px; height: 20px; border-radius: 999px; background: rgba(255,255,255,0.22); margin-left: 5px; padding: 1px 6px; }
  .notificationsList, .reservationList { display: grid; gap: 8px; }
  .notificationItem { width: 100%; border: 1px solid rgba(15,23,42,0.06); background: #fffdf7; border-radius: 20px; padding: 12px; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 10px; align-items: start; cursor: pointer; text-align: left; }
  .notificationEmoji { width: 42px; height: 42px; border-radius: 16px; background: #eef2e5; display: flex; align-items: center; justify-content: center; font-size: 21px; }
  .notificationContent { display: grid; min-width: 0; }
  .notificationContent strong { color: #172018; font-size: 14px; font-weight: 950; line-height: 1.25; }
  .notificationContent small { color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 700; margin-top: 3px; }
  .notificationContent em { color: #94a3b8; font-size: 10px; font-style: normal; font-weight: 850; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .emptyBox { border: 1px dashed rgba(15,23,42,0.16); background: #fffdf7; border-radius: 20px; padding: 16px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.45; font-weight: 750; }
  .reservationList button { border: 1px solid rgba(15,23,42,0.06); background: #fffdf7; border-radius: 18px; padding: 8px; display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 10px; align-items: center; text-align: left; cursor: pointer; }
  .reservationList img, .reservationList > button > span:first-child { width: 46px; height: 46px; border-radius: 14px; object-fit: cover; background: #eef2e5; display: flex; align-items: center; justify-content: center; }
  .reservationList strong { display: block; color: #172018; font-size: 12px; line-height: 1.25; font-weight: 950; }
  .reservationList small { display: block; margin-top: 3px; color: #64748b; font-size: 11px; font-weight: 750; line-height: 1.35; }
  @media (max-width: 1040px) { .hero, .mainGrid { grid-template-columns: 1fr; } .statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 720px) { .topbar { padding: 7px 10px; } .topbarInner { grid-template-columns: 1fr auto; } .brandName { grid-column: 1; justify-self: start; align-items: flex-start; max-width: calc(100vw - 96px); text-align: left; } .brandName strong { font-size: clamp(23px, 8.2vw, 34px); letter-spacing: -0.07em; } .brandName span { font-size: 7.5px; letter-spacing: 0.12em; max-width: calc(100vw - 112px); overflow: hidden; text-overflow: ellipsis; } .avatarMini { grid-column: 2; width: 36px; height: 36px; box-shadow: none; } .shell { padding: 12px 9px 40px; } .heroText, .homeHotCard, .panel { border-radius: 24px; } .heroText { padding: 20px; } .heroText h1 { font-size: 39px; line-height: .94; } .homeHotVisual { min-height: 320px; } .statsGrid { grid-template-columns: 1fr; } .journeySplit { grid-template-columns: repeat(2, minmax(0, 1fr)); } .medalStatContent { gap: 12px; } .lastMedalPreview { width: 54px; height: 54px; border-radius: 18px; } .tabs { width: 100%; display: grid; grid-template-columns: 1fr 1fr; border-radius: 18px; } .tabs button { width: 100%; } }
`;
