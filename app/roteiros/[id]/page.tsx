"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { registrarAtividade } from "@/lib/logAtividade";

type AnyRecord = Record<string, any>;

type Roteiro = {
  id: string;
  titulo?: string;
  nome?: string;
  descricao?: string;
  preco?: number;
  valor?: number;
  duracao_horas?: number;
  duracao?: string;
  km?: number;
  distancia_km?: number;
  dificuldade?: string;
  nivel?: string;
  localizacao?: string;
  local?: string;
  cidade?: string;
  endereco_formatado?: string;
  foto_capa?: string | null;
  foto_url?: string | null;
  imagem_url?: string | null;
  image_url?: string | null;
  capa_url?: string | null;
  galeria_fotos?: string[];
  imagens?: string[];
  embarque_local?: string;
  ponto_encontro?: string;
  local_encontro?: string;
  embarque_data?: string;
  embarque_data_hora?: string;
  data_roteiro?: string;
  data_trilha?: string;
  proxima_data?: string;
  data_disponivel?: string;
  data_saida?: string;
  data_inicio?: string;
  data_evento?: string;
  retorno_local?: string;
  retorno_data?: string;
  retorno_data_hora?: string;
  roteiro_detalhado?: string;
  detalhes?: string;
  inclui?: string;
  nao_inclui?: string;
  orientacoes?: string;
  status?: string;
  id_guia?: string;
  guia_id?: string;
  user_id?: string;
  usuario_id?: string;
  criado_por?: string;
  created_by?: string;
  owner_id?: string;
  limite_pessoas?: number | null;
};

type Guia = {
  id: string;
  nome?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
  imagem_url?: string | null;
  bio?: string | null;
  instagram?: string | null;
  cadastur?: string | null;
};

type Clima = {
  sucesso?: boolean;
  disponivel?: boolean;
  motivo?: string;
  mensagem?: string;
  data_referencia?: string | null;
  resumo?: string;
  icone?: string;
  temperatura?: number | null;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
  temperatura_atual?: number | null;
  chance_chuva?: number | null;
  chuva_probabilidade?: number | null;
  chuva_mm?: number | null;
  vento_kmh?: number | null;
  umidade?: number | null;
  indice_uv?: number | null;
  atualizado_em?: string | null;
  badge?: {
    icone?: string;
    temperatura?: number | null;
    chance_chuva?: number | null;
    texto?: string;
  } | null;
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

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function tituloRoteiro(roteiro?: Roteiro | null) {
  return texto(roteiro?.titulo || roteiro?.nome) || "Roteiro PrussikTrails";
}

function fotoPrincipal(roteiro?: Roteiro | null) {
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
      roteiro?.endereco_formatado ||
        roteiro?.localizacao ||
        roteiro?.local ||
        roteiro?.cidade ||
        roteiro?.embarque_local,
    ) || "Local a confirmar"
  );
}

function pontoEncontro(roteiro?: Roteiro | null) {
  return texto(
    roteiro?.ponto_encontro ||
      roteiro?.local_encontro ||
      roteiro?.embarque_local ||
      roteiro?.localizacao ||
      roteiro?.local,
  );
}

function guiaIdRoteiro(roteiro?: Roteiro | null) {
  return texto(
    roteiro?.id_guia ||
      roteiro?.guia_id ||
      roteiro?.user_id ||
      roteiro?.usuario_id ||
      roteiro?.criado_por ||
      roteiro?.created_by ||
      roteiro?.owner_id,
  );
}

function precoRoteiro(roteiro?: Roteiro | null) {
  return numero(roteiro?.preco ?? roteiro?.valor);
}

function kmRoteiro(roteiro?: Roteiro | null) {
  return numero(roteiro?.km ?? roteiro?.distancia_km);
}

function duracaoRoteiro(roteiro?: Roteiro | null) {
  return (
    texto(
      roteiro?.duracao ||
        (roteiro?.duracao_horas ? `${roteiro.duracao_horas} h` : ""),
    ) || "A definir"
  );
}

function dataISOValida(valor: unknown) {
  const raw = texto(valor);
  if (!raw) return "";

  const somenteData = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(somenteData)) {
    const data = new Date(`${somenteData}T12:00:00`);
    if (!Number.isNaN(data.getTime())) return somenteData;
  }

  const data = new Date(raw);
  if (Number.isNaN(data.getTime())) return "";

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataBase(roteiro?: Roteiro | null) {
  const fontes = [
    roteiro?.data_disponivel,
    roteiro?.proxima_data,
    roteiro?.data_trilha,
    roteiro?.embarque_data_hora,
    roteiro?.embarque_data,
    roteiro?.data_roteiro,
    roteiro?.data_saida,
    roteiro?.data_inicio,
    roteiro?.data_evento,
  ];

  for (const fonte of fontes) {
    const data = dataISOValida(fonte);
    if (data) return data;
  }

  return "";
}

function formatarData(data?: string | null) {
  if (!data) return "Data a definir";
  const date = new Date(`${String(data).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Data a definir";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarMoeda(valor: unknown) {
  return numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarNumero(valor: unknown, sufixo = "") {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: n % 1 === 0 ? 0 : 1 })}${sufixo}`;
}

function primeiroNumeroValido(...valores: unknown[]) {
  for (const valor of valores) {
    if (valor === null || valor === undefined || valor === "") continue;
    const n = Number(valor);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function normalizarClimaResponse(data: any): Clima | null {
  if (!data) return null;

  const clima = data?.clima || {};
  const previsao = data?.previsao || {};
  const badge = data?.badge || {};

  const temperatura = primeiroNumeroValido(
    data?.temperatura,
    data?.temperatura_max,
    data?.temperatura_atual,
    clima?.temperatura,
    clima?.temperatura_max,
    clima?.temperatura_atual,
    previsao?.temperatura,
    previsao?.temperatura_max,
    badge?.temperatura,
  );

  const temperaturaMin = primeiroNumeroValido(
    data?.temperatura_min,
    clima?.temperatura_min,
    previsao?.temperatura_min,
  );

  const temperaturaAtual = primeiroNumeroValido(
    data?.temperatura_atual,
    data?.temperatura,
    clima?.temperatura_atual,
    clima?.temperatura,
    previsao?.temperatura,
    badge?.temperatura,
  );

  const temperaturaMax = primeiroNumeroValido(
    data?.temperatura_max,
    data?.temperatura,
    clima?.temperatura_max,
    clima?.temperatura,
    previsao?.temperatura_max,
    previsao?.temperatura,
    badge?.temperatura,
    temperaturaAtual,
  );

  const chanceChuva =
    primeiroNumeroValido(
      data?.chance_chuva,
      data?.chuva_probabilidade,
      clima?.chance_chuva,
      clima?.chuva_probabilidade,
      previsao?.chance_chuva,
      previsao?.chuva_probabilidade,
      badge?.chance_chuva,
    ) ?? 0;

  const chuvaMm =
    primeiroNumeroValido(data?.chuva_mm, clima?.chuva_mm, previsao?.chuva_mm) ?? 0;

  const ventoKmh = primeiroNumeroValido(data?.vento_kmh, clima?.vento_kmh, previsao?.vento_kmh);
  const umidade = primeiroNumeroValido(data?.umidade, clima?.umidade, previsao?.umidade);
  const indiceUv = primeiroNumeroValido(data?.indice_uv, clima?.indice_uv, previsao?.indice_uv);

  const disponivelInformado =
    data?.disponivel === true ||
    clima?.disponivel === true ||
    previsao?.disponivel === true;

  const temTemperatura =
    temperatura !== null ||
    temperaturaMax !== null ||
    temperaturaAtual !== null;

  if (!disponivelInformado && !temTemperatura) {
    return {
      sucesso: data?.sucesso !== false,
      disponivel: false,
      motivo: data?.motivo || data?.codigo || "CLIMA_INDISPONIVEL",
      mensagem: data?.mensagem || "Previsão climática indisponível para este roteiro agora.",
    };
  }

  return {
    sucesso: data?.sucesso !== false,
    disponivel: true,
    motivo: data?.motivo || data?.codigo || "",
    mensagem: data?.mensagem || clima?.mensagem || previsao?.mensagem || "",
    data_referencia:
      data?.data_referencia ||
      clima?.data_referencia ||
      previsao?.data_referencia ||
      null,
    resumo:
      data?.resumo ||
      clima?.resumo ||
      previsao?.resumo ||
      "Previsão climática",
    icone:
      data?.icone ||
      clima?.icone ||
      previsao?.icone ||
      badge?.icone ||
      "🌤️",
    temperatura: temperatura,
    temperatura_min: temperaturaMin,
    temperatura_max: temperaturaMax,
    temperatura_atual: temperaturaAtual,
    chance_chuva: chanceChuva,
    chuva_probabilidade: chanceChuva,
    chuva_mm: chuvaMm,
    vento_kmh: ventoKmh,
    umidade,
    indice_uv: indiceUv,
    atualizado_em:
      data?.atualizado_em ||
      clima?.atualizado_em ||
      previsao?.atualizado_em ||
      "",
    badge: {
      icone: data?.icone || clima?.icone || previsao?.icone || badge?.icone || "🌤️",
      temperatura: temperaturaMax ?? temperaturaAtual ?? temperatura,
      chance_chuva: chanceChuva,
      texto:
        badge?.texto ||
        `${data?.icone || clima?.icone || previsao?.icone || badge?.icone || "🌤️"} ${Math.round(Number(temperaturaMax ?? temperaturaAtual ?? temperatura ?? 0))}° · ${Math.round(Number(chanceChuva || 0))}%`,
    },
  };
}

function nomeGuia(guia?: Guia | null) {
  return texto(guia?.nome || guia?.name || guia?.email) || "Guia PrussikTrails";
}

function avatarGuia(guia?: Guia | null) {
  return texto(guia?.avatar_url || guia?.foto_url || guia?.imagem_url);
}

function irParaDashboardPorTipo(router: ReturnType<typeof useRouter>) {
  try {
    const userData =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const usuario = userData
      ? (JSON.parse(userData) as { tipo?: string | null })
      : null;

    if (usuario?.tipo === "cliente") return router.push("/cliente/dashboard");
    if (usuario?.tipo === "guia") return router.push("/guia/dashboard");
    if (usuario?.tipo === "admin") return router.push("/admin/dashboard");

    return router.push("/login");
  } catch {
    return router.push("/login");
  }
}

function erroDeColunaAusente(error: any) {
  const mensagem = String(
    error?.message || error?.details || error?.hint || "",
  ).toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    mensagem.includes("schema cache") ||
    mensagem.includes("could not find") ||
    mensagem.includes("column") ||
    mensagem.includes("does not exist")
  );
}

function extrairColunaAusente(error: any) {
  const textoErro = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ");

  const matchReservas = textoErro.match(/reservas\.([a-zA-Z0-9_]+)/);
  if (matchReservas?.[1]) return matchReservas[1];

  const matchAspas = textoErro.match(/'([^']+)'/);
  if (matchAspas?.[1]) return matchAspas[1];

  const matchColumn = textoErro.match(/column\s+[\"']?([a-zA-Z0-9_]+)[\"']?/i);
  if (matchColumn?.[1]) return matchColumn[1];

  return "";
}

export default function DetalhesRoteiro() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);
  const [guia, setGuia] = useState<Guia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [reservando, setReservando] = useState(false);
  const [quantidadePessoas, setQuantidadePessoas] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [fotoSelecionada, setFotoSelecionada] = useState(0);
  const [usuarioLogado, setUsuarioLogado] = useState<AnyRecord | null>(null);
  const [clima, setClima] = useState<Clima | null>(null);
  const [modalClimaAberto, setModalClimaAberto] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUsuarioLogado(JSON.parse(userData));
    carregarRoteiro();
    carregarClima();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const todasFotos = useMemo(() => {
    const lista = [
      fotoPrincipal(roteiro),
      ...((roteiro?.galeria_fotos || []) as string[]),
      ...((roteiro?.imagens || []) as string[]),
    ]
      .map(texto)
      .filter(Boolean);

    return Array.from(new Set(lista));
  }, [roteiro]);

  const fotoAtual = todasFotos[fotoSelecionada] || fotoPrincipal(roteiro);

  async function carregarRoteiro() {
    setCarregando(true);
    setMensagem("");

    try {
      const { data: roteiroData, error: roteiroError } = await supabase
        .from("roteiros")
        .select("*")
        .eq("id", id)
        .single();

      if (roteiroError) throw roteiroError;

      const roteiroCarregado = roteiroData as Roteiro;
      setRoteiro(roteiroCarregado);

      const guiaId = guiaIdRoteiro(roteiroCarregado);

      if (guiaId) {
        const { data: guiaData } = await supabase
          .from("users")
          .select("*")
          .eq("id", guiaId)
          .maybeSingle();

        setGuia((guiaData || null) as Guia | null);
      }
    } catch (err: any) {
      console.error(err);
      setMensagem(err?.message || "Não foi possível carregar este roteiro.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarClima() {
    try {
      const response = await fetch(
        `/api/clima/roteiro/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => null);
      setClima(normalizarClimaResponse(data));
    } catch (error) {
      console.warn("Não foi possível carregar clima:", error);
      setClima(null);
    }
  }

  async function inserirReservaComFallback(payloadOriginal: AnyRecord) {
    let payload: AnyRecord = { ...payloadOriginal };

    for (let tentativa = 0; tentativa < 18; tentativa++) {
      const { data, error } = await supabase
        .from("reservas")
        .insert(payload)
        .select("*")
        .single();

      if (!error) return data as AnyRecord;

      if (!erroDeColunaAusente(error)) throw error;

      const coluna = extrairColunaAusente(error);

      if (!coluna || !(coluna in payload)) {
        console.error("Coluna ausente não mapeada ao criar reserva:", error);
        throw error;
      }

      delete payload[coluna];

      if (Object.keys(payload).length === 0) {
        throw new Error("Nenhuma coluna disponível para criar a reserva.");
      }
    }

    throw new Error("Não foi possível criar a reserva após ajustar colunas.");
  }

  async function handleReservar() {
    if (!usuarioLogado?.id) {
      router.push("/login");
      return;
    }

    if (!roteiro?.id) return;

    setReservando(true);
    setMensagem("");

    try {
      const valorTotal = precoRoteiro(roteiro) * quantidadePessoas;
      const dataTrilhaReserva = dataBase(roteiro) || hojeISO();

      if (valorTotal <= 0) {
        throw new Error("Valor do roteiro inválido para criar a reserva.");
      }

      // Fluxo restaurado:
      // 1) cria a reserva com payload mínimo e compatível;
      // 2) envia o cliente para a página de pagamento;
      // 3) o PIX só é gerado em /cliente/pagamento/[reservaId].
      // Não enviamos data_roteiro nem updated_at porque essas colunas não existem em reservas.
      const payloadReserva: AnyRecord = {
        cliente_id: usuarioLogado.id,
        roteiro_id: roteiro.id,
        quantidade_pessoas: quantidadePessoas,
        valor_total: valorTotal,
        data_trilha: dataTrilhaReserva,
        data_reserva: dataTrilhaReserva,
        status: "aguardando_pagamento",
        status_pagamento: "pendente",
        pagamento_status: "pendente",
      };

      const reserva = await inserirReservaComFallback(payloadReserva);

      const primeiroNome =
        usuarioLogado.nome?.split(" ")[0] ||
        usuarioLogado.email?.split("@")[0] ||
        "Cliente";

      try {
        await registrarAtividade(
          usuarioLogado.id,
          "cliente",
          primeiroNome,
          "reservou",
          `${primeiroNome} iniciou uma reserva do roteiro "${tituloRoteiro(roteiro)}"`,
          roteiro.id,
        );
      } catch (logError) {
        console.warn("Log de reserva não registrado:", logError);
      }

      router.push(`/cliente/pagamento/${reserva.id}`);
    } catch (err: any) {
      setMensagem(`❌ ${err.message || "Erro ao criar reserva"}`);
    } finally {
      setReservando(false);
    }
  }

  if (carregando) {
    return (
      <main className="loading">
        <style>{styles}</style>
        <div className="spinner" />
        <p>Carregando roteiro...</p>
      </main>
    );
  }

  if (!roteiro) {
    return (
      <main className="loading">
        <style>{styles}</style>
        <p>Roteiro não encontrado.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <style>{styles}</style>

      <header className="header">
        <div className="headerInner">
          <button
            type="button"
            className="brandLogoOnly"
            onClick={() => irParaDashboardPorTipo(router)}
            aria-label="Voltar para o painel"
          >
            <img src="/logo-prussik-display.png" alt="PrussikTrails" />
          </button>
        </div>
      </header>

      <section className="container">
        {mensagem && <div className="alert">{mensagem}</div>}

        <section className="heroGrid">
          <div className="mediaCard">
            <div
              className="mainPhoto"
              style={
                {
                  "--photo": fotoAtual
                    ? `url("${fotoAtual}")`
                    : "linear-gradient(135deg,#203c2e,#647a49)",
                } as CSSProperties
              }
            >
              {clima?.disponivel && (
                <button
                  type="button"
                  className="climaBadge"
                  onClick={() => setModalClimaAberto(true)}
                  aria-label="Ver previsão do clima para este roteiro"
                  title="Ver clima da data"
                >
                  <span className="climaIcon">
                    {clima.badge?.icone || clima.icone || "🌤️"}
                  </span>
                  <span className="climaNumbers">
                    <strong>
                      {clima.badge?.temperatura !== null &&
                      clima.badge?.temperatura !== undefined
                        ? `${Math.round(Number(clima.badge.temperatura))}°`
                        : clima.temperatura_max !== null &&
                            clima.temperatura_max !== undefined
                          ? `${Math.round(Number(clima.temperatura_max))}°`
                          : clima.temperatura_atual !== null &&
                              clima.temperatura_atual !== undefined
                            ? `${Math.round(Number(clima.temperatura_atual))}°`
                            : "—°"}
                    </strong>
                    <span className="climaDivider">·</span>
                    <small>
                      {clima.badge?.chance_chuva !== null &&
                      clima.badge?.chance_chuva !== undefined
                        ? `${Math.round(Number(clima.badge.chance_chuva))}%`
                        : clima.chance_chuva !== null &&
                            clima.chance_chuva !== undefined
                          ? `${Math.round(Number(clima.chance_chuva))}%`
                          : "—%"}
                    </small>
                  </span>
                </button>
              )}
            </div>

            {todasFotos.length > 1 && (
              <div className="thumbs">
                {todasFotos.slice(0, 6).map((foto, index) => (
                  <button
                    key={foto}
                    type="button"
                    className={index === fotoSelecionada ? "active" : ""}
                    onClick={() => setFotoSelecionada(index)}
                  >
                    <img src={foto} alt={`Foto ${index + 1} do roteiro`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="bookingCard">
            <div className="price">{formatarMoeda(precoRoteiro(roteiro))}</div>
            <p>Valor por pessoa</p>

            <label className="field">
              <span>Pessoas</span>
              <input
                type="number"
                min={1}
                max={roteiro.limite_pessoas || 99}
                value={quantidadePessoas}
                onChange={(e) =>
                  setQuantidadePessoas(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>

            <button
              type="button"
              className="reserveButton"
              onClick={handleReservar}
              disabled={reservando}
            >
              {reservando ? "Criando reserva..." : "Continuar para pagamento"}
            </button>

            <div className="guideMini">
              <div className="guideAvatar">
                {avatarGuia(guia) ? (
                  <img src={avatarGuia(guia)} alt={nomeGuia(guia)} />
                ) : (
                  <span>{nomeGuia(guia).slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div>
                <strong>{nomeGuia(guia)}</strong>
                <small>
                  {guia?.cadastur
                    ? `CADASTUR ${guia.cadastur}`
                    : "Guia/Agência PrussikTrails"}
                </small>
              </div>
            </div>

            {guia?.id && (
              <button
                type="button"
                className="guideButton"
                onClick={() => router.push(`/guia/publico/${guia.id}`)}
              >
                Ver perfil do guia
              </button>
            )}
          </aside>
        </section>

        <section className="contentGrid">
          <article className="contentCard mainContent">
            <div className="eyebrow">Roteiro</div>
            <h1>{tituloRoteiro(roteiro)}</h1>
            <p className="description">
              {roteiro.descricao || "Descrição em atualização pelo guia."}
            </p>

            <div className="infoGrid">
              <div>
                <span>Local</span>
                <strong>{localRoteiro(roteiro)}</strong>
              </div>
              <div>
                <span>Data</span>
                <strong>{formatarData(dataBase(roteiro))}</strong>
              </div>
              <div>
                <span>Nível</span>
                <strong>
                  {roteiro.dificuldade || roteiro.nivel || "A definir"}
                </strong>
              </div>
              <div>
                <span>Distância</span>
                <strong>{formatarNumero(kmRoteiro(roteiro), " km")}</strong>
              </div>
              <div>
                <span>Duração</span>
                <strong>{duracaoRoteiro(roteiro)}</strong>
              </div>
              <div>
                <span>Vagas</span>
                <strong>
                  {roteiro.limite_pessoas
                    ? `Até ${roteiro.limite_pessoas} pessoas`
                    : "A confirmar"}
                </strong>
              </div>
            </div>

            {pontoEncontro(roteiro) && (
              <section className="textBlock">
                <h2>Ponto de encontro</h2>
                <p>{pontoEncontro(roteiro)}</p>
              </section>
            )}

            {(roteiro.roteiro_detalhado || roteiro.detalhes) && (
              <section className="textBlock">
                <h2>Como será a experiência</h2>
                <p>{roteiro.roteiro_detalhado || roteiro.detalhes}</p>
              </section>
            )}

            {roteiro.inclui && (
              <section className="textBlock">
                <h2>Inclui</h2>
                <p>{roteiro.inclui}</p>
              </section>
            )}

            {roteiro.nao_inclui && (
              <section className="textBlock">
                <h2>Não inclui</h2>
                <p>{roteiro.nao_inclui}</p>
              </section>
            )}

            {roteiro.orientacoes && (
              <section className="textBlock">
                <h2>Orientações ao aventureiro</h2>
                <p>{roteiro.orientacoes}</p>
              </section>
            )}
          </article>
        </section>
      </section>

      {modalClimaAberto && (
        <div
          className="modalOverlay"
          onClick={() => setModalClimaAberto(false)}
        >
          <section
            className="climaModal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              onClick={() => setModalClimaAberto(false)}
            >
              ×
            </button>
            <div className="eyebrow">Clima da data</div>
            <h2>
              {clima?.disponivel
                ? `${clima.icone || "🌦️"} ${clima.resumo || "Previsão climática"}`
                : "🌦️ Previsão indisponível"}
            </h2>
            <p>
              {clima?.mensagem ||
                "A previsão será exibida quando houver coordenadas e data compatível com a janela gratuita."}
            </p>

            {clima?.disponivel && (
              <div className="weatherGrid">
                <div>
                  <span>Data</span>
                  <strong>{formatarData(clima.data_referencia)}</strong>
                </div>
                <div>
                  <span>Temperatura</span>
                  <strong>
                    {formatarNumero(clima.temperatura_min, "°C")} /{" "}
                    {formatarNumero(clima.temperatura_max, "°C")}
                  </strong>
                </div>
                <div>
                  <span>Chuva</span>
                  <strong>
                    {formatarNumero(clima.chance_chuva, "%")} ·{" "}
                    {formatarNumero(clima.chuva_mm, " mm")}
                  </strong>
                </div>
                <div>
                  <span>Vento</span>
                  <strong>{formatarNumero(clima.vento_kmh, " km/h")}</strong>
                </div>
                <div>
                  <span>Umidade</span>
                  <strong>{formatarNumero(clima.umidade, "%")}</strong>
                </div>
                <div>
                  <span>Índice UV</span>
                  <strong>{formatarNumero(clima.indice_uv)}</strong>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f7f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  button, input { font: inherit; }
  .page, .loading { min-height: 100vh; min-height: 100dvh; color: #172018; background: radial-gradient(circle at 10% 0%, rgba(132,204,22,.16), transparent 28%), radial-gradient(circle at 90% 10%, rgba(251,146,60,.14), transparent 28%), linear-gradient(180deg,#fffdf7 0%,#f3f5ea 48%,#eef2e5 100%); }
  .loading { display: grid; place-items: center; align-content: center; gap: 12px; color: #203c2e; font-weight: 900; }
  .spinner { width: 44px; height: 44px; border-radius: 999px; border: 4px solid rgba(32,60,46,.12); border-top-color: #dc2626; animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .header { position: sticky; top: 0; z-index: 30; background: rgba(255,253,247,.92); border-bottom: 1px solid rgba(15,23,42,.06); backdrop-filter: blur(18px); padding: 8px 12px; }
  .headerInner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
  .brandLogoOnly { border: 0; background: transparent; padding: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
  .brandLogoOnly img { width: clamp(150px,36vw,250px); height: auto; max-height: 58px; object-fit: contain; display: block; }
  .container { max-width: 1180px; margin: 0 auto; padding: 22px 16px 54px; }
  .alert { margin-bottom: 16px; padding: 13px 14px; border-radius: 16px; background: #fee2e2; color: #991b1b; font-size: 13px; font-weight: 850; }
  .heroGrid { display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 18px; align-items: start; }
  .mediaCard, .bookingCard, .contentCard { background: rgba(255,255,255,.88); border: 1px solid rgba(32,60,46,.08); border-radius: 30px; box-shadow: 0 18px 48px rgba(32,60,46,.08); overflow: hidden; }
  .mainPhoto { position: relative; min-height: 520px; background: linear-gradient(135deg, rgba(23,32,24,.25), rgba(23,32,24,.08)), var(--photo); background-size: cover; background-position: center; }
  .climaBadge { position: absolute; top: 16px; right: 16px; z-index: 3; border: 0; background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; color: #ffffff; border-radius: 0; padding: 0; display: inline-flex; align-items: center; gap: 5px; box-shadow: none; cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,.46), 0 2px 7px rgba(0,0,0,.24); transition: opacity .18s ease; }
  .climaBadge:hover { opacity: .92; }
  .climaBadge .climaIcon { font-size: 15px; line-height: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,.34)); }
  .climaNumbers { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
  .climaBadge strong, .climaBadge small, .climaDivider { color: #ffffff; font-size: 13px; font-weight: 950; line-height: 1; letter-spacing: -0.01em; }
  .thumbs { padding: 12px; display: flex; gap: 10px; overflow-x: auto; }
  .thumbs button { border: 2px solid transparent; background: transparent; border-radius: 16px; padding: 0; width: 84px; height: 64px; overflow: hidden; flex: 0 0 auto; cursor: pointer; }
  .thumbs button.active { border-color: #dc2626; }
  .thumbs img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .bookingCard { padding: 20px; position: sticky; top: 92px; }
  .price { color: #203c2e; font-size: 38px; line-height: 1; font-weight: 950; letter-spacing: -.06em; }
  .bookingCard p { margin: 7px 0 16px; color: #64748b; font-size: 13px; font-weight: 750; }
  .field { display: grid; gap: 7px; margin-bottom: 14px; }
  .field span { color: #475569; font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
  .field input { width: 100%; border: 1px solid rgba(32,60,46,.12); border-radius: 16px; padding: 12px 13px; background: #fff; color: #172018; font-weight: 750; outline: none; }
  .reserveButton, .guideButton { width: 100%; border: 0; border-radius: 999px; padding: 13px 15px; font-size: 13px; font-weight: 950; cursor: pointer; }
  .reserveButton { background: #dc2626; color: #fff; }
  .reserveButton:disabled { opacity: .56; cursor: not-allowed; }
  .guideButton { margin-top: 12px; background: #eef2e5; color: #203c2e; }
  .guideMini { margin-top: 18px; display: grid; grid-template-columns: 48px minmax(0,1fr); gap: 10px; align-items: center; }
  .guideAvatar { width: 48px; height: 48px; border-radius: 999px; background: #203c2e; color: #fffdf7; overflow: hidden; display: grid; place-items: center; font-weight: 950; }
  .guideAvatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .guideMini strong { display: block; color: #172018; font-size: 14px; font-weight: 950; }
  .guideMini small { display: block; margin-top: 3px; color: #64748b; font-size: 12px; font-weight: 750; }
  .contentGrid { margin-top: 18px; display: grid; grid-template-columns: 1fr; }
  .mainContent { padding: 24px; }
  .eyebrow { color: #991b1b; font-size: 11px; font-weight: 950; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 10px; }
  .mainContent h1 { margin: 0; color: #172018; font-size: clamp(38px,5vw,68px); line-height: .94; letter-spacing: -.075em; font-weight: 950; }
  .description { max-width: 850px; color: #64748b; font-size: 15px; line-height: 1.65; font-weight: 700; }
  .infoGrid, .weatherGrid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; margin-top: 18px; }
  .infoGrid div, .weatherGrid div { border-radius: 20px; padding: 14px; background: #fffdf7; border: 1px solid rgba(32,60,46,.08); }
  .infoGrid span, .weatherGrid span { display: block; color: #64748b; font-size: 10px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }
  .infoGrid strong, .weatherGrid strong { color: #172018; font-size: 14px; font-weight: 950; line-height: 1.25; }
  .textBlock { margin-top: 22px; border-top: 1px solid rgba(32,60,46,.08); padding-top: 18px; }
  .textBlock h2 { margin: 0 0 8px; color: #203c2e; font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -.045em; }
  .textBlock p { margin: 0; white-space: pre-line; color: #475569; font-size: 14px; line-height: 1.65; font-weight: 700; }
  .modalOverlay { position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(8,13,7,.50); backdrop-filter: blur(10px); }
  .pixModal { position: relative; width: min(460px,100%); border-radius: 30px; background: #fffdf7; border: 1px solid rgba(15,23,42,.08); box-shadow: 0 34px 90px rgba(15,23,42,.24); padding: 24px; text-align: center; }
  .pixModal h2 { margin: 0; color: #172018; font-size: 28px; line-height: 1; font-weight: 950; letter-spacing: -.055em; }
  .pixModal p { color: #64748b; line-height: 1.55; font-size: 13px; font-weight: 750; }
  .pixQrWrap { width: 238px; height: 238px; margin: 16px auto; border-radius: 22px; background: #fff; border: 1px solid rgba(15,23,42,.08); display: grid; place-items: center; overflow: hidden; }
  .pixQrWrap img { width: 220px; height: 220px; object-fit: contain; display: block; }
  .pixText { width: 100%; min-height: 112px; border: 1px solid rgba(15,23,42,.10); background: #fff; border-radius: 18px; padding: 12px; color: #172018; font-size: 12px; line-height: 1.4; resize: vertical; outline: none; }
  .copyButton, .pixSecondaryButton { width: 100%; border: 0; border-radius: 999px; padding: 13px 15px; font-size: 13px; font-weight: 950; cursor: pointer; margin-top: 10px; }
  .copyButton { background: #16a34a; color: #fff; }
  .pixSecondaryButton { background: #172018; color: #fffdf7; }
  .climaModal { position: relative; width: min(560px,100%); border-radius: 30px; background: #fffdf7; border: 1px solid rgba(15,23,42,.08); box-shadow: 0 34px 90px rgba(15,23,42,.24); padding: 24px; }
  .climaModal h2 { margin: 0; color: #172018; font-size: 30px; line-height: 1; font-weight: 950; letter-spacing: -.055em; }
  .climaModal p { color: #64748b; line-height: 1.55; font-weight: 750; }
  .close { position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(15,23,42,.08); background: #f8fafc; color: #172018; font-size: 24px; cursor: pointer; }
  @media (max-width: 980px) { .heroGrid { grid-template-columns: 1fr; } .bookingCard { position: static; } .infoGrid, .weatherGrid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  @media (max-width: 640px) { .header { padding: 7px 10px; } .brandLogoOnly img { width: clamp(142px,52vw,218px); max-height: 50px; } .container { padding: 14px 10px 40px; } .mediaCard, .bookingCard, .contentCard { border-radius: 24px; } .mainPhoto { min-height: 360px; } .bookingCard, .mainContent { padding: 16px; } .infoGrid, .weatherGrid { grid-template-columns: 1fr; } .climaBadge { top: 12px; right: 12px; } }
`;
