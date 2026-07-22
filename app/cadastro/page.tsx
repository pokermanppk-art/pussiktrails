"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TipoUsuario = "cliente" | "guia";

type FormCadastro = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  senha: string;
  confirmar_senha: string;
  tipo: TipoUsuario;
};

type UsuarioLocal = {
  id?: string;
  nome?: string | null;
  email?: string | null;
  tipo?: string | null;
  telefone?: string | null;
  celular?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  avatar_url?: string | null;
  foto_url?: string | null;
  imagem_url?: string | null;
};

const LOGO_CADASTRO_SRC = "/logo-login-montanha-prussik.jpg?v=20260528";

const formInicial: FormCadastro = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  data_nascimento: "",
  senha: "",
  confirmar_senha: "",
  tipo: "cliente",
};

function CadastroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conviteAfiliado = String(searchParams.get("convite") || "").trim();
  const cadastroViaAfiliado = Boolean(conviteAfiliado);
  const tipoSolicitado = String(searchParams.get("tipo") || "").toLowerCase();

  const [form, setForm] = useState<FormCadastro>(formInicial);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"erro" | "sucesso" | "">("");

  useEffect(() => {
    if (cadastroViaAfiliado || tipoSolicitado === "guia") {
      setForm((prev) => ({ ...prev, tipo: "guia" }));
    }
  }, [cadastroViaAfiliado, tipoSolicitado]);

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) return;

    try {
      const user = JSON.parse(userData) as UsuarioLocal;
      const tipo = String(user?.tipo || "").toLowerCase();

      if (user?.id && tipo === "cliente") {
        router.replace("/cliente/dashboard");
        return;
      }

      if (user?.id && tipo === "guia") {
        router.replace("/guia/dashboard");
        return;
      }

      if (user?.id && tipo === "admin") {
        router.replace("/admin/dashboard");
      }
    } catch {
      localStorage.removeItem("user");
    }
  }, [router]);

  function texto(valor: unknown) {
    return String(valor || "").trim();
  }

  function somenteNumeros(valor: unknown) {
    return texto(valor).replace(/\D/g, "");
  }

  function formatarTelefone(valor: string) {
    const numeros = somenteNumeros(valor).slice(0, 11);

    if (numeros.length <= 2) return numeros;

    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  function formatarCpf(valor: string) {
    const numeros = somenteNumeros(valor).slice(0, 11);

    if (numeros.length <= 3) return numeros;

    if (numeros.length <= 6) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    }

    if (numeros.length <= 9) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    }

    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  }

  function validarCpf(valor: string) {
    const cpf = somenteNumeros(valor);

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;

    for (let i = 0; i < 9; i++) {
      soma += Number(cpf.charAt(i)) * (10 - i);
    }

    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf.charAt(9))) return false;

    soma = 0;

    for (let i = 0; i < 10; i++) {
      soma += Number(cpf.charAt(i)) * (11 - i);
    }

    digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;

    return digito === Number(cpf.charAt(10));
  }

  function atualizarCampo(campo: keyof FormCadastro, valor: string) {
    setMensagem("");
    setTipoMensagem("");

    if (campo === "telefone") {
      setForm((prev) => ({
        ...prev,
        telefone: formatarTelefone(valor),
      }));
      return;
    }

    if (campo === "cpf") {
      setForm((prev) => ({
        ...prev,
        cpf: formatarCpf(valor),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function alterarTipo(tipo: TipoUsuario) {
    if (cadastroViaAfiliado && tipo !== "guia") return;

    setMensagem("");
    setTipoMensagem("");

    setForm((prev) => ({
      ...prev,
      tipo,
    }));
  }

  function validarEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function calcularIdade(dataNascimento: string) {
    if (!dataNascimento) return 0;

    const hoje = new Date();
    const nascimento = new Date(dataNascimento);

    if (Number.isNaN(nascimento.getTime())) return 0;

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  }

  function isMaiorDeIdade(dataNascimento: string) {
    return calcularIdade(dataNascimento) >= 18;
  }

  function validarFormulario() {
    const nome = texto(form.nome);
    const email = texto(form.email).toLowerCase();
    const telefone = somenteNumeros(form.telefone);
    const cpf = somenteNumeros(form.cpf);

    if (!nome) return "Informe seu nome completo.";

    if (nome.split(" ").filter(Boolean).length < 2) {
      return "Informe seu nome e sobrenome.";
    }

    if (!email || !validarEmail(email)) {
      return "Informe um e-mail válido.";
    }

    if (!telefone || telefone.length < 10) {
      return "Informe um celular válido.";
    }

    if (!cpf || cpf.length !== 11 || !validarCpf(cpf)) {
      return "Informe um CPF válido. Ele será usado para gerar o PIX com segurança.";
    }

    if (!form.data_nascimento) {
      return "Informe sua data de nascimento.";
    }

    if (!isMaiorDeIdade(form.data_nascimento)) {
      const idade = calcularIdade(form.data_nascimento);
      return `Cadastro não permitido para menores de 18 anos. Idade informada: ${idade} anos.`;
    }

    if (!form.senha || form.senha.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }

    if (form.senha !== form.confirmar_senha) {
      return "As senhas não conferem.";
    }

    return "";
  }

  function rotaPorTipo(tipo?: string | null) {
    const t = String(tipo || "").toLowerCase();

    if (t === "guia") return "/guia/dashboard";
    if (t === "admin") return "/admin/dashboard";

    return "/cliente/dashboard";
  }

  async function cadastrar(event: FormEvent) {
    event.preventDefault();

    if (carregando) return;

    setMensagem("");
    setTipoMensagem("");

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setMensagem(erroValidacao);
      setTipoMensagem("erro");
      return;
    }

    setCarregando(true);

    try {
      const cpfLimpo = somenteNumeros(form.cpf);
      const telefoneLimpo = somenteNumeros(form.telefone);

      const response = await fetch("/api/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          nome: texto(form.nome),
          email: texto(form.email).toLowerCase(),
          telefone: telefoneLimpo,
          telefone_formatado: formatarTelefone(form.telefone),
          celular: telefoneLimpo,
          celular_formatado: formatarTelefone(form.telefone),
          cpf: cpfLimpo,
          cpf_cnpj: cpfLimpo,
          documento: cpfLimpo,
          cpf_formatado: formatarCpf(form.cpf),
          data_nascimento: form.data_nascimento,
          nascimento: form.data_nascimento,
          senha: form.senha,
          password: form.senha,
          confirmar_senha: form.confirmar_senha,
          tipo: form.tipo,
          affiliate_invitation_token: conviteAfiliado || null,
        }),
      });

      const respostaTexto = await response.text();
      let data: any = null;

      try {
        data = respostaTexto ? JSON.parse(respostaTexto) : null;
      } catch {
        throw new Error("A rota de cadastro retornou uma resposta inválida.");
      }

      if (!response.ok || !data?.sucesso) {
        throw new Error(
          data?.erro ||
            data?.message ||
            "Não foi possível realizar o cadastro.",
        );
      }

      const usuario: UsuarioLocal = {
        id: data.usuario?.id,
        nome: data.usuario?.nome || texto(form.nome),
        email: data.usuario?.email || texto(form.email).toLowerCase(),
        tipo: data.usuario?.tipo || form.tipo,
        telefone:
          data.usuario?.telefone || data.usuario?.celular || telefoneLimpo,
        celular:
          data.usuario?.celular || data.usuario?.telefone || telefoneLimpo,
        cpf: data.usuario?.cpf || data.usuario?.documento || cpfLimpo,
        data_nascimento: data.usuario?.data_nascimento || form.data_nascimento,
        avatar_url: data.usuario?.avatar_url || null,
        foto_url: data.usuario?.foto_url || null,
        imagem_url: data.usuario?.imagem_url || null,
      };

      if (usuario.id) {
        localStorage.setItem("user", JSON.stringify(usuario));
      }

      let vinculoAfiliadoConfirmado = false;

      if (conviteAfiliado && usuario.id && (usuario.tipo || form.tipo) === "guia") {
        try {
          const vinculoResponse = await fetch(
            "/api/afiliados/convites/confirmar-cadastro",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
              body: JSON.stringify({
                invitationToken: conviteAfiliado,
                guideUserId: usuario.id,
                guideName: usuario.nome || texto(form.nome),
                guideEmail: usuario.email || texto(form.email).toLowerCase(),
                guidePhone:
                  usuario.telefone || usuario.celular || telefoneLimpo,
              }),
            },
          );

          const vinculoData = await vinculoResponse.json().catch(() => ({}));
          vinculoAfiliadoConfirmado =
            vinculoResponse.ok && Boolean(vinculoData?.sucesso);

          if (!vinculoAfiliadoConfirmado) {
            console.warn(
              "Cadastro concluído, mas o vínculo do afiliado ficou pendente:",
              vinculoData?.erro,
            );
          }
        } catch (vinculoError) {
          console.warn(
            "Cadastro concluído, mas não foi possível confirmar o afiliado:",
            vinculoError,
          );
        }
      }

      setMensagem(
        form.tipo === "guia"
          ? conviteAfiliado && vinculoAfiliadoConfirmado
            ? "Cadastro de guia realizado e indicação vinculada com sucesso."
            : conviteAfiliado
              ? "Cadastro de guia realizado. A indicação será conferida pela equipe."
              : "Cadastro de guia realizado com sucesso. Vamos preparar sua área."
          : "Cadastro realizado com sucesso. Vamos preparar sua área.",
      );
      setTipoMensagem("sucesso");

      setTimeout(() => {
        router.replace(data.redirectTo || rotaPorTipo(usuario.tipo));
      }, 650);
    } catch (error: any) {
      console.error("Erro no cadastro:", error);

      setMensagem(
        error?.message ||
          "Erro ao realizar cadastro. Verifique os dados e tente novamente.",
      );
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fffdf7;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 8% 0%, rgba(132, 204, 22, 0.15), transparent 30%),
            radial-gradient(circle at 92% 8%, rgba(251, 146, 60, 0.10), transparent 28%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 48%, #eef2e5 100%);
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 14px;
        }

        .container {
          width: 100%;
          max-width: 540px;
          margin: 0 auto;
        }

        .card {
          background: rgba(255, 255, 255, 0.94);
          border-radius: 34px;
          padding: 30px 30px 34px;
          box-shadow:
            0 24px 58px rgba(32, 60, 46, 0.12),
            0 8px 22px rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.055);
          backdrop-filter: blur(14px);
          overflow: hidden;
        }

        .brand {
          display: flex;
          justify-content: center;
          margin: 0 auto 12px;
          width: 100%;
          overflow: visible;
        }

        .brandLogoCrop {
          width: 220px;
          height: 116px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          flex: 0 0 auto;
        }

        .brandLogoCrop img {
          width: 220px;
          height: 220px;
          object-fit: contain;
          display: block;
          transform: scale(1.58);
          transform-origin: center;
        }

        .heroPhrase {
          margin: 0 auto 22px;
          max-width: 360px;
          text-align: center;
          color: #172018;
          font-size: 29px;
          line-height: 1.04;
          font-weight: 950;
          letter-spacing: -0.065em;
        }

        .heroPhrase span {
          color: #203c2e;
        }

        .supportText {
          max-width: 410px;
          margin: -10px auto 22px;
          text-align: center;
          color: #7b8372;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 750;
        }

        .affiliateInvite {
          margin: -4px 0 18px;
          padding: 14px 16px;
          border-radius: 18px;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          text-align: center;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 850;
        }

        .typeSelector {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 18px;
          background: #eef2e5;
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 999px;
          padding: 5px;
        }

        .typeButton {
          border: none;
          border-radius: 999px;
          padding: 12px 14px;
          background: transparent;
          color: #64748b;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .typeButton.active {
          background: #203c2e;
          color: #ffffff;
          box-shadow: 0 12px 24px rgba(32, 60, 46, 0.18);
        }

        .form {
          display: grid;
          gap: 15px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .formGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .formGroup.full {
          grid-column: 1 / -1;
        }

        label {
          font-size: 13px;
          font-weight: 900;
          color: #334155;
          letter-spacing: -0.01em;
        }

        input {
          width: 100%;
          border: 1px solid #dbe4f2;
          border-radius: 18px;
          padding: 15px 17px;
          font-size: 15.5px;
          color: #111827;
          background: #eef5ff;
          outline: none;
          transition: 0.2s ease;
        }

        input:focus {
          background: #ffffff;
          border-color: #203c2e;
          box-shadow: 0 0 0 4px rgba(32, 60, 46, 0.11);
        }

        input::placeholder {
          color: #94a3b8;
        }

        input:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .miniHelp {
          margin: -3px 0 0;
          color: #7b8372;
          font-size: 11px;
          line-height: 1.35;
          font-weight: 750;
        }

        .message {
          padding: 13px 15px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.45;
          text-align: center;
          font-weight: 850;
          border: 1px solid transparent;
        }

        .message.erro {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .message.sucesso {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .submitButton {
          width: 100%;
          border: none;
          border-radius: 999px;
          padding: 17px;
          background: #203c2e;
          color: #ffffff;
          font-size: 17px;
          font-weight: 950;
          cursor: pointer;
          transition: 0.2s ease;
          margin-top: 4px;
          box-shadow: 0 14px 26px rgba(32, 60, 46, 0.18);
        }

        .submitButton:hover:not(:disabled) {
          background: #294735;
          transform: translateY(-1px);
          box-shadow: 0 18px 32px rgba(32, 60, 46, 0.24);
        }

        .submitButton:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .linkRow {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .textButton {
          border: none;
          background: transparent;
          color: #203c2e;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          padding: 4px 6px;
        }

        .textButton:hover {
          text-decoration: underline;
        }

        .textButton:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        .hint {
          margin: 18px 0 0;
          text-align: center;
          color: #7b8372;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        @media (max-width: 560px) {
          .page {
            align-items: flex-start;
            padding: 18px 12px 26px;
          }

          .container {
            max-width: 100%;
          }

          .card {
            border-radius: 30px;
            padding: 26px 20px 30px;
          }

          .brand {
            margin-bottom: 10px;
          }

          .brandLogoCrop {
            width: 198px;
            height: 106px;
          }

          .brandLogoCrop img {
            width: 198px;
            height: 198px;
            transform: scale(1.54);
          }

          .heroPhrase {
            font-size: 27px;
            max-width: 300px;
            margin-bottom: 18px;
          }

          .supportText {
            margin-bottom: 20px;
          }

          .formGrid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .typeButton {
            font-size: 12px;
            padding: 11px 10px;
          }

          input {
            font-size: 15px;
            padding: 14px 15px;
          }

          .submitButton {
            padding: 15px;
            font-size: 16px;
          }
        }

        @media (max-width: 380px) {
          .card {
            padding: 24px 18px 28px;
          }

          .brandLogoCrop {
            width: 184px;
            height: 98px;
          }

          .brandLogoCrop img {
            width: 184px;
            height: 184px;
            transform: scale(1.50);
          }

          .heroPhrase {
            font-size: 25px;
          }

          .typeSelector {
            border-radius: 24px;
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="container">
        <section className="card">
          <div className="brand">
            <div className="brandLogoCrop">
              <img
                src={LOGO_CADASTRO_SRC}
                alt="PrussikTrails"
                loading="eager"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>

          <p className="heroPhrase">
            Comece sua
            <br />
            jornada no
            <br />
            <span>PrussikTrails.</span>
          </p>

          <p className="supportText">
            Crie sua conta para reservar experiências ou cadastrar roteiros como
            guia.
          </p>

          {cadastroViaAfiliado ? (
            <div className="affiliateInvite">
              Você recebeu um convite individual de um afiliado PrussikTrails.
              Conclua o cadastro como Guia para confirmar a indicação.
            </div>
          ) : null}

          <div className="typeSelector" aria-label="Tipo de cadastro">
            <button
              type="button"
              className={`typeButton ${form.tipo === "cliente" ? "active" : ""}`}
              onClick={() => alterarTipo("cliente")}
              disabled={carregando || cadastroViaAfiliado}
            >
              Sou aventureiro
            </button>

            <button
              type="button"
              className={`typeButton ${form.tipo === "guia" ? "active" : ""}`}
              onClick={() => alterarTipo("guia")}
              disabled={carregando}
            >
              Sou guia
            </button>
          </div>

          <form className="form" onSubmit={cadastrar}>
            <div className="formGrid">
              <div className="formGroup full">
                <label>Nome completo *</label>
                <input
                  value={form.nome}
                  onChange={(event) =>
                    atualizarCampo("nome", event.target.value)
                  }
                  placeholder="Seu nome completo"
                  type="text"
                  autoComplete="name"
                  disabled={carregando}
                />
              </div>

              <div className="formGroup full">
                <label>E-mail *</label>
                <input
                  value={form.email}
                  onChange={(event) =>
                    atualizarCampo("email", event.target.value)
                  }
                  placeholder="seuemail@email.com"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  disabled={carregando}
                />
              </div>

              <div className="formGroup">
                <label>Celular *</label>
                <input
                  value={form.telefone}
                  onChange={(event) =>
                    atualizarCampo("telefone", event.target.value)
                  }
                  placeholder="(11) 99999-9999"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={carregando}
                />
              </div>

              <div className="formGroup">
                <label>CPF *</label>
                <input
                  value={form.cpf}
                  onChange={(event) =>
                    atualizarCampo("cpf", event.target.value)
                  }
                  placeholder="000.000.000-00"
                  type="text"
                  autoComplete="off"
                  inputMode="numeric"
                  disabled={carregando}
                />
                <p className="miniHelp">
                  Necessário para gerar PIX e confirmar reservas com a PagHiper.
                </p>
              </div>

              <div className="formGroup full">
                <label>Data de nascimento *</label>
                <input
                  value={form.data_nascimento}
                  onChange={(event) =>
                    atualizarCampo("data_nascimento", event.target.value)
                  }
                  type="date"
                  autoComplete="bday"
                  disabled={carregando}
                />
              </div>

              <div className="formGroup">
                <label>Senha *</label>
                <input
                  value={form.senha}
                  onChange={(event) =>
                    atualizarCampo("senha", event.target.value)
                  }
                  placeholder="Mínimo 6 caracteres"
                  type="password"
                  autoComplete="new-password"
                  disabled={carregando}
                />
              </div>

              <div className="formGroup">
                <label>Confirmar senha *</label>
                <input
                  value={form.confirmar_senha}
                  onChange={(event) =>
                    atualizarCampo("confirmar_senha", event.target.value)
                  }
                  placeholder="Repita sua senha"
                  type="password"
                  autoComplete="new-password"
                  disabled={carregando}
                />
              </div>
            </div>

            {mensagem && (
              <div className={`message ${tipoMensagem || "erro"}`}>
                {mensagem}
              </div>
            )}

            <button
              type="submit"
              className="submitButton"
              disabled={carregando}
            >
              {carregando
                ? "Criando sua conta..."
                : form.tipo === "guia"
                  ? "Criar conta de guia"
                  : "Criar minha conta"}
            </button>
          </form>

          <div className="linkRow">
            <button
              type="button"
              className="textButton"
              onClick={() => router.push("/login")}
              disabled={carregando}
            >
              Já tenho conta. Entrar
            </button>
          </div>

          <p className="hint">
            O cadastro é permitido apenas para maiores de 18 anos. CPF e celular
            são usados para pagamento, confirmação de reserva e segurança da
            conta.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#fffdf7",
            color: "#203c2e",
            fontWeight: 900,
          }}
        >
          Abrindo o cadastro...
        </main>
      }
    >
      <CadastroPageContent />
    </Suspense>
  );
}
