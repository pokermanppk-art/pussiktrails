'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

type SectionId = 'passport' | 'missions' | 'gear' | 'ranking' | 'premium'

type NavItem = {
  id: SectionId
  label: string
  code: string
  icon: ReactNode
}

type Mission = {
  title: string
  description: string
  xp: string
  status: string
  progress: number
}

type Gear = {
  title: string
  subtitle: string
  metric: string
  icon: ReactNode
}

type Rank = {
  position: string
  name: string
  className: string
  xp: string
}

const navItems: NavItem[] = [
  { id: 'passport', label: 'Wild Passport', code: '01', icon: <AgentIcon /> },
  { id: 'missions', label: 'Mission Board', code: '02', icon: <TargetIcon /> },
  { id: 'gear', label: 'Gear Vault', code: '03', icon: <GearIcon /> },
  { id: 'ranking', label: 'Elite Ranking', code: '04', icon: <RankingIcon /> },
  { id: 'premium', label: 'Black Access', code: '05', icon: <CrownIcon /> }
]

const missions: Mission[] = [
  {
    title: 'Completar 3 trilhas premium',
    description: 'Conclua três experiências oficiais PrussikTrails em até 30 dias.',
    xp: '+1.500 XP',
    status: 'Em andamento',
    progress: 67
  },
  {
    title: 'Desbloquear rota de altitude',
    description: 'Finalize uma trilha acima de 1.800m com guia certificado.',
    xp: '+2.200 XP',
    status: 'Bloqueada',
    progress: 18
  },
  {
    title: 'Checklist de segurança avançado',
    description: 'Complete todos os protocolos de equipamento, clima e orientação.',
    xp: '+700 XP',
    status: 'Concluída',
    progress: 100
  }
]

const gear: Gear[] = [
  {
    title: 'Thermo Jacket',
    subtitle: 'Camada modular com IA térmica',
    metric: '37.2°C CORE',
    icon: <JacketIcon />
  },
  {
    title: 'Solar Shelter',
    subtitle: 'Abrigo ultraleve autônomo',
    metric: '2.8KG PACK',
    icon: <TentIcon />
  },
  {
    title: 'Satellite Map',
    subtitle: 'Navegação offline tática',
    metric: '99.7% LOCK',
    icon: <SatelliteIcon />
  },
  {
    title: 'Rescue Protocol',
    subtitle: 'Plano de segurança premium',
    metric: 'READY',
    icon: <ShieldIcon />
  }
]

const ranking: Rank[] = [
  {
    position: '#01',
    name: 'Ana Ridge',
    className: 'Aurora Elite',
    xp: '8.420 XP'
  },
  {
    position: '#02',
    name: 'Marcos Summit',
    className: 'Peak Hunter',
    xp: '7.880 XP'
  },
  {
    position: '#03',
    name: 'Sr. Brito',
    className: 'Trail Commander',
    xp: '6.940 XP'
  },
  {
    position: '#04',
    name: 'Lia NightTrail',
    className: 'Shadow Hiker',
    xp: '6.210 XP'
  }
]

export default function PremiumDemoPage() {
  const [active, setActive] = useState<SectionId>('passport')

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #000000;
          color: #f4fff7;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button {
          font-family: inherit;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 8%, rgba(0, 255, 102, 0.16), transparent 30%),
            radial-gradient(circle at 86% 2%, rgba(255, 255, 255, 0.07), transparent 26%),
            linear-gradient(180deg, #000000 0%, #050705 48%, #000000 100%);
          position: relative;
          overflow-x: hidden;
        }

        .page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: 0.42;
          mask-image: linear-gradient(180deg, black, transparent 85%);
          z-index: 0;
        }

        .shell {
          position: relative;
          z-index: 1;
          max-width: 1480px;
          margin: 0 auto;
          padding: 22px;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 18px;
        }

        .sidebar {
          min-height: calc(100vh - 44px);
          border: 1px solid rgba(0,255,102,0.16);
          background: linear-gradient(180deg, rgba(18,18,18,0.92), rgba(0,0,0,0.86));
          backdrop-filter: blur(18px);
          border-radius: 30px;
          padding: 14px 10px;
          position: sticky;
          top: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          box-shadow:
            0 26px 80px rgba(0,0,0,0.48),
            inset 0 0 28px rgba(0,255,102,0.035);
        }

        .logo {
          width: 58px;
          height: 58px;
          border-radius: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #001a08;
          background: linear-gradient(135deg, #00ff66, #a6ffc7);
          box-shadow: 0 0 34px rgba(0,255,102,0.28);
          margin-bottom: 8px;
        }

        .side-button {
          width: 56px;
          height: 56px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.035);
          color: #9ba49e;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 19px;
          cursor: pointer;
          transition: 0.24s ease;
        }

        .side-button.active,
        .side-button:hover {
          color: #00ff66;
          border-color: rgba(0,255,102,0.36);
          background: rgba(0,255,102,0.09);
          box-shadow: 0 0 26px rgba(0,255,102,0.14);
        }

        .content {
          min-width: 0;
        }

        .topbar {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.68);
          backdrop-filter: blur(18px);
          border-radius: 30px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 18px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.35);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-mark {
          width: 50px;
          height: 50px;
          border: 1px solid rgba(0,255,102,0.22);
          background:
            radial-gradient(circle at 30% 20%, rgba(0,255,102,0.24), transparent 42%),
            linear-gradient(135deg, #101310, #000000);
          color: #00ff66;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand h1 {
          margin: 0;
          color: #ffffff;
          font-size: 20px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .brand p {
          margin: 5px 0 0;
          color: #8d978f;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          border: 1px solid rgba(74,74,74,0.95);
          background: rgba(255,255,255,0.025);
          color: #f4fff7;
          padding: 11px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .btn:hover {
          border-color: rgba(0,255,102,0.72);
          color: #00ff66;
          box-shadow: 0 0 22px rgba(0,255,102,0.14);
        }

        .btn.primary {
          border-color: rgba(0,255,102,0.6);
          background: rgba(0,255,102,0.08);
          color: #00ff66;
        }

        .hero {
          min-height: 620px;
          border-radius: 36px;
          border: 1px solid rgba(255,255,255,0.09);
          overflow: hidden;
          position: relative;
          margin-bottom: 18px;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.88)),
            radial-gradient(circle at 52% 10%, rgba(255,255,255,0.10), transparent 22%),
            radial-gradient(circle at 27% 42%, rgba(0,255,102,0.14), transparent 25%),
            linear-gradient(135deg, #101010, #000000 48%, #050805);
          box-shadow:
            0 35px 120px rgba(0,0,0,0.58),
            inset 0 0 80px rgba(255,255,255,0.025);
        }

        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 34px 34px;
          opacity: 0.34;
          mask-image: linear-gradient(180deg, black, transparent);
        }

        .hero::after {
          content: '';
          position: absolute;
          inset: auto 0 0;
          height: 230px;
          background:
            linear-gradient(180deg, transparent, #000000),
            repeating-linear-gradient(
              90deg,
              rgba(0,255,102,0.05) 0px,
              rgba(0,255,102,0.05) 1px,
              transparent 1px,
              transparent 18px
            );
          opacity: 0.82;
        }

        .hero-inner {
          position: relative;
          z-index: 2;
          min-height: 620px;
          padding: 32px;
          display: grid;
          grid-template-rows: auto 1fr auto;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }

        .system-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 13px;
          border: 1px solid rgba(0,255,102,0.24);
          background: rgba(0,255,102,0.06);
          color: #00ff66;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .system-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00ff66;
          box-shadow: 0 0 18px rgba(0,255,102,0.9);
        }

        .coords {
          text-align: right;
          color: #8f9a91;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          line-height: 1.8;
        }

        .hero-center {
          align-self: center;
          max-width: 1000px;
        }

        .eyebrow {
          color: #00ff66;
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .title {
          margin: 0;
          font-weight: 200;
          font-size: clamp(46px, 8vw, 116px);
          line-height: 0.92;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .title span {
          color: #00ff66;
          text-shadow: 0 0 32px rgba(0,255,102,0.26);
        }

        .subtitle {
          margin: 24px 0 0;
          max-width: 680px;
          color: #a0aaa2;
          font-size: 15px;
          line-height: 1.8;
          letter-spacing: 0.03em;
        }

        .hero-bottom {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: end;
          flex-wrap: wrap;
        }

        .agent-strip {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .avatar {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          padding: 3px;
          background: conic-gradient(from 180deg, #00ff66, #4a4a4a, #ffffff, #00ff66);
          box-shadow: 0 0 30px rgba(0,255,102,0.22);
          position: relative;
        }

        .avatar-core {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 22%, rgba(0,255,102,0.24), transparent 34%),
            linear-gradient(180deg, #151515, #000000);
          border: 3px solid #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00ff66;
        }

        .activity {
          position: absolute;
          right: 2px;
          bottom: 4px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 3px solid #000000;
          background: #00ff66;
          box-shadow: 0 0 18px rgba(0,255,102,0.9);
        }

        .agent-name {
          font-size: 19px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ffffff;
          font-weight: 300;
        }

        .agent-id {
          margin-top: 4px;
          color: #8d978f;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .status-grid {
          display: grid;
          grid-template-columns: 1.2fr repeat(3, 1fr);
          gap: 1px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }

        .status-cell {
          background: rgba(0,0,0,0.78);
          padding: 18px;
        }

        .cell-label {
          color: #7e8a82;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .cell-value {
          color: #ffffff;
          font-size: 28px;
          font-weight: 200;
          letter-spacing: 0.08em;
        }

        .cell-note {
          color: #00ff66;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .xp-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #9ca5a0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          margin-bottom: 9px;
        }

        .xp-bar {
          height: 10px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          width: 76%;
          background: linear-gradient(90deg, #4a4a4a, #00ff66);
          box-shadow: 0 0 24px rgba(0,255,102,0.32);
        }

        .mobile-tabs {
          display: grid;
          grid-template-columns: repeat(5, minmax(148px, 1fr));
          gap: 1px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.08);
          margin-bottom: 18px;
          overflow-x: auto;
        }

        .tab {
          min-width: 148px;
          border: none;
          padding: 16px;
          background: rgba(0,0,0,0.82);
          color: #858f88;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 11px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          cursor: pointer;
          transition: 0.24s ease;
        }

        .tab.active,
        .tab:hover {
          color: #00ff66;
          background: rgba(0,255,102,0.06);
          box-shadow: inset 0 -2px 0 #00ff66;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          animation: fadeUp 0.24s ease;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel {
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02)),
            rgba(0,0,0,0.72);
          backdrop-filter: blur(18px);
          box-shadow: 0 26px 80px rgba(0,0,0,0.34);
        }

        .panel-head {
          padding: 20px 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .panel-title {
          margin: 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .panel-code {
          color: #00ff66;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .passport-card {
          padding: 20px;
        }

        .passport-inner {
          border: 1px solid rgba(0,255,102,0.18);
          padding: 22px;
          background:
            radial-gradient(circle at 90% 10%, rgba(0,255,102,0.12), transparent 30%),
            rgba(0,0,0,0.58);
        }

        .passport-title {
          color: #00ff66;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .passport-name {
          color: #ffffff;
          font-size: 42px;
          font-weight: 200;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .passport-text {
          color: #9aa39d;
          line-height: 1.75;
          font-size: 13px;
          max-width: 680px;
        }

        .passport-data {
          margin-top: 26px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .data-cell {
          background: #000000;
          padding: 15px;
        }

        .data-label {
          color: #7e8a82;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .data-value {
          margin-top: 7px;
          color: #ffffff;
          font-size: 18px;
          font-weight: 300;
        }

        .mission-list,
        .gear-list,
        .ranking-list {
          padding: 20px;
          display: grid;
          gap: 14px;
        }

        .mission-card,
        .gear-card,
        .rank-card {
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 85% 16%, rgba(0,255,102,0.09), transparent 28%),
            rgba(0,0,0,0.55);
          padding: 17px;
          transition: 0.24s ease;
        }

        .mission-card:hover,
        .gear-card:hover,
        .rank-card:hover {
          border-color: rgba(0,255,102,0.32);
          transform: translateY(-2px);
          box-shadow: 0 0 34px rgba(0,255,102,0.08);
        }

        .mission-top,
        .gear-top,
        .rank-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .mission-title,
        .gear-title,
        .rank-name {
          color: #ffffff;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 400;
        }

        .mission-xp,
        .gear-metric,
        .rank-xp {
          color: #00ff66;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
        }

        .mission-desc,
        .gear-sub,
        .rank-class {
          margin-top: 9px;
          color: #8d978f;
          font-size: 12px;
          line-height: 1.6;
        }

        .mission-status {
          display: inline-flex;
          margin-top: 12px;
          color: #00ff66;
          border: 1px solid rgba(0,255,102,0.22);
          padding: 5px 8px;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .progress {
          height: 9px;
          background: rgba(255,255,255,0.07);
          margin-top: 14px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a4a4a, #00ff66);
        }

        .achievement-grid {
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .achievement {
          min-height: 158px;
          padding: 17px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 80% 20%, rgba(0,255,102,0.11), transparent 28%),
            rgba(0,0,0,0.55);
          position: relative;
          overflow: hidden;
        }

        .achievement::after {
          content: '';
          position: absolute;
          right: -36px;
          bottom: -36px;
          width: 110px;
          height: 110px;
          border-radius: 999px;
          background: rgba(0,255,102,0.12);
          filter: blur(10px);
        }

        .hex-icon {
          width: 56px;
          height: 56px;
          color: #00ff66;
          border: 1px solid rgba(0,255,102,0.22);
          background: rgba(0,255,102,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
          margin-bottom: 16px;
          position: relative;
          z-index: 2;
        }

        .achievement-title {
          color: #ffffff;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          position: relative;
          z-index: 2;
        }

        .achievement-desc {
          margin-top: 8px;
          color: #919b95;
          font-size: 12px;
          line-height: 1.6;
          position: relative;
          z-index: 2;
        }

        .subscription {
          padding: 24px;
          min-height: 460px;
          border: 1px solid rgba(0,255,102,0.28);
          background:
            radial-gradient(circle at 80% 0%, rgba(0,255,102,0.14), transparent 34%),
            linear-gradient(180deg, rgba(0,255,102,0.08), rgba(255,255,255,0.02)),
            rgba(0,0,0,0.78);
        }

        .subscription h3 {
          margin: 0;
          color: #ffffff;
          font-size: 32px;
          font-weight: 200;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .price {
          margin-top: 22px;
          color: #00ff66;
          font-size: 46px;
          font-weight: 200;
          letter-spacing: 0.08em;
        }

        .price span {
          color: #8f9a91;
          font-size: 13px;
        }

        .features {
          margin-top: 24px;
          display: grid;
          gap: 12px;
        }

        .feature {
          color: #a2aaa5;
          font-size: 13px;
          line-height: 1.6;
          display: flex;
          gap: 10px;
        }

        .feature::before {
          content: '';
          width: 7px;
          height: 7px;
          background: #00ff66;
          margin-top: 7px;
          box-shadow: 0 0 14px rgba(0,255,102,0.7);
          flex: 0 0 auto;
        }

        .terminal {
          margin-top: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.026) 1px, transparent 1px),
            #000000;
          background-size: 36px 36px;
          padding: 22px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .terminal-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .terminal-link {
          color: #a0aaa2;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .terminal-link span {
          color: #00ff66;
          margin-right: 8px;
        }

        .terminal-system {
          color: #00ff66;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
        }

        @media (max-width: 1180px) {
          .shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            display: none;
          }

          .status-grid,
          .panel-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .shell {
            padding: 12px;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .top-actions {
            width: 100%;
          }

          .btn {
            flex: 1;
          }

          .hero,
          .hero-inner {
            min-height: 660px;
          }

          .hero-inner {
            padding: 20px;
          }

          .hero-top {
            flex-direction: column;
          }

          .coords {
            text-align: left;
          }

          .title {
            font-size: 44px;
          }

          .hero-bottom {
            align-items: flex-start;
          }

          .passport-data,
          .achievement-grid {
            grid-template-columns: 1fr;
          }

          .brand h1 {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="shell">
        <aside className="sidebar">
          <div className="logo">
            <PrussikIcon />
          </div>

          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-button ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </aside>

        <section className="content">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">
                <PrussikIcon />
              </div>

              <div>
                <h1>PrussikTrails Expedition OS</h1>
                <p>Outdoor luxury interface • Premium system demo</p>
              </div>
            </div>

            <div className="top-actions">
              <button className="btn">Manifesto</button>
              <button className="btn">Tecnologia</button>
              <button className="btn primary">Iniciar Expedição</button>
            </div>
          </header>

          <section className="hero">
            <div className="hero-inner">
              <div className="hero-top">
                <div className="system-chip">
                  <span className="system-dot" />
                  Expedition OS Active
                </div>

                <div className="coords">
                  GPS -22.7381 / -45.5924<br />
                  ALTITUDE 2.418M<br />
                  SIGNAL LOCK 99.7%
                </div>
              </div>

              <div className="hero-center">
                <div className="eyebrow">Black Access Protocol</div>

                <h2 className="title">
                  O amanhã pertence aos <span>selvagens</span>.
                </h2>

                <p className="subtitle">
                  Uma central premium para aventureiros: identidade digital,
                  reputação, missões, equipamentos, ranking e comunidade dentro de
                  uma experiência outdoor futurista.
                </p>
              </div>

              <div className="hero-bottom">
                <div className="agent-strip">
                  <div className="avatar">
                    <div className="avatar-core">
                      <AgentIcon />
                    </div>
                    <span className="activity" />
                  </div>

                  <div>
                    <div className="agent-name">Sr. Brito</div>
                    <div className="agent-id">AGENT ID: WILD-0010 • LVL 10</div>
                  </div>
                </div>

                <div className="top-actions">
                  <button className="btn primary">Iniciar Expedição</button>
                  <button className="btn">Abrir Passport</button>
                </div>
              </div>
            </div>
          </section>

          <section className="status-grid">
            <div className="status-cell">
              <div className="cell-label">Progressão</div>
              <div className="xp-meta">
                <span>4.958.322 XP</span>
                <span>6.000.000 XP</span>
              </div>
              <div className="xp-bar">
                <div className="xp-fill" />
              </div>
              <div className="cell-note">76% até o próximo nível</div>
            </div>

            <div className="status-cell">
              <div className="cell-label">Experiências</div>
              <div className="cell-value">127</div>
              <div className="cell-note">rotas registradas</div>
            </div>

            <div className="status-cell">
              <div className="cell-label">Conquistas</div>
              <div className="cell-value">48</div>
              <div className="cell-note">badges liberados</div>
            </div>

            <div className="status-cell">
              <div className="cell-label">Comunidade</div>
              <div className="cell-value">319</div>
              <div className="cell-note">conexões outdoor</div>
            </div>
          </section>

          <nav className="mobile-tabs">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab ${active === item.id ? 'active' : ''}`}
                onClick={() => setActive(item.id)}
              >
                {item.code}. {item.label}
              </button>
            ))}
          </nav>

          {active === 'passport' && <PassportSection />}
          {active === 'missions' && <MissionSection />}
          {active === 'gear' && <GearSection />}
          {active === 'ranking' && <RankingSection />}
          {active === 'premium' && <PremiumSection />}

          <footer className="terminal">
            <div className="terminal-links">
              <div className="terminal-link"><span>01.</span>Tecnologia</div>
              <div className="terminal-link"><span>02.</span>Sustentabilidade</div>
              <div className="terminal-link"><span>03.</span>Manifesto</div>
              <div className="terminal-link"><span>04.</span>Black Access</div>
            </div>

            <div className="terminal-system">
              PRUSSIKTRAILS_OS // ACTIVE // AURORA_GREEN
            </div>
          </footer>
        </section>
      </div>
    </main>
  )
}

function PassportSection() {
  return (
    <section className="panel-grid">
      <div className="panel passport-card">
        <div className="passport-inner">
          <div className="passport-title">Wild Passport</div>

          <div className="passport-name">Sr. Brito</div>

          <p className="passport-text">
            Identidade premium do aventureiro dentro do PrussikTrails.
            O Wild Passport reúne nível, classe, conquistas, trilhas realizadas,
            ranking e reputação comunitária em uma experiência visual de alto padrão.
          </p>

          <div className="passport-data">
            <div className="data-cell">
              <div className="data-label">Classe</div>
              <div className="data-value">Trail Commander</div>
            </div>

            <div className="data-cell">
              <div className="data-label">Nível</div>
              <div className="data-value">LVL 10</div>
            </div>

            <div className="data-cell">
              <div className="data-label">Altitude acumulada</div>
              <div className="data-value">48.200m</div>
            </div>

            <div className="data-cell">
              <div className="data-label">Ranking</div>
              <div className="data-value">Top 3</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Field Badges</h3>
          <span className="panel-code">ACHV_04</span>
        </div>

        <div className="achievement-grid">
          <Achievement title="Wild Future" description="10 rotas premium concluídas." icon={<MountainIcon />} />
          <Achievement title="Aurora Runner" description="Missões ao amanhecer desbloqueadas." icon={<BoltIcon />} />
          <Achievement title="Carbon Scout" description="Checklist técnico concluído." icon={<ShieldIcon />} />
          <Achievement title="Silent Signal" description="Navegação offline sem perda." icon={<SignalIcon />} />
        </div>
      </div>
    </section>
  )
}

function MissionSection() {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Mission Board</h3>
          <span className="panel-code">MISSION_03</span>
        </div>

        <div className="mission-list">
          {missions.map((mission) => (
            <article key={mission.title} className="mission-card">
              <div className="mission-top">
                <div className="mission-title">{mission.title}</div>
                <div className="mission-xp">{mission.xp}</div>
              </div>

              <div className="mission-desc">{mission.description}</div>
              <span className="mission-status">{mission.status}</span>

              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${mission.progress}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel passport-card">
        <div className="passport-inner">
          <div className="passport-title">Reward System</div>
          <div className="passport-name">+4.400 XP</div>
          <p className="passport-text">
            Missões mensais podem alimentar o ranking, liberar badges, abrir
            experiências especiais e futuramente conectar benefícios para clientes
            premium e guias parceiros.
          </p>
        </div>
      </div>
    </section>
  )
}

function GearSection() {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Gear Vault</h3>
          <span className="panel-code">GEAR_04</span>
        </div>

        <div className="gear-list">
          {gear.map((item) => (
            <article key={item.title} className="gear-card">
              <div className="gear-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="hex-icon" style={{ marginBottom: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="gear-title">{item.title}</div>
                    <div className="gear-sub">{item.subtitle}</div>
                  </div>
                </div>

                <div className="gear-metric">{item.metric}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel passport-card">
        <div className="passport-inner">
          <div className="passport-title">Tech Hub</div>
          <div className="passport-name">Field Ready</div>
          <p className="passport-text">
            O Tech Hub pode virar uma área premium para equipamentos, checklists,
            protocolos de segurança, recomendações por clima e preparação para cada
            roteiro.
          </p>
        </div>
      </div>
    </section>
  )
}

function RankingSection() {
  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Elite Ranking</h3>
          <span className="panel-code">RANK_TOP</span>
        </div>

        <div className="ranking-list">
          {ranking.map((item) => (
            <article key={item.position} className="rank-card">
              <div className="rank-top">
                <div>
                  <div className="rank-name">{item.position} • {item.name}</div>
                  <div className="rank-class">{item.className}</div>
                </div>

                <div className="rank-xp">{item.xp}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel passport-card">
        <div className="passport-inner">
          <div className="passport-title">Community Layer</div>
          <div className="passport-name">319</div>
          <p className="passport-text">
            O ranking pode alimentar comunidade, engajamento, desafios mensais,
            rotas patrocinadas e camada futura de monetização por assinatura.
          </p>
        </div>
      </div>
    </section>
  )
}

function PremiumSection() {
  return (
    <section className="panel-grid">
      <div className="subscription">
        <h3>Black Access</h3>

        <div className="price">
          R$ 29<span>/mês</span>
        </div>

        <div className="features">
          <div className="feature">Perfil público avançado com identidade premium.</div>
          <div className="feature">Badges exclusivos, molduras, ranking e missões.</div>
          <div className="feature">Prioridade em experiências especiais e grupos fechados.</div>
          <div className="feature">Camada futura de benefícios para guias e aventureiros.</div>
          <div className="feature">Acesso antecipado a rotas, eventos e desafios sazonais.</div>
        </div>

        <button className="btn primary" style={{ marginTop: 28 }}>
          Ativar Black Access
        </button>
      </div>

      <div className="panel passport-card">
        <div className="passport-inner">
          <div className="passport-title">Revenue Concept</div>
          <div className="passport-name">Premium Layer</div>
          <p className="passport-text">
            A assinatura não vende apenas recurso visual. Ela vende status,
            reputação, comunidade, prioridade, progressão e acesso a experiências
            selecionadas.
          </p>
        </div>
      </div>
    </section>
  )
}

function Achievement({
  title,
  description,
  icon
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <article className="achievement">
      <div className="hex-icon">{icon}</div>
      <div className="achievement-title">{title}</div>
      <div className="achievement-desc">{description}</div>
    </article>
  )
}

/* SVG ICONS */

function PrussikIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 16L10.5 8L13.5 13L16 9L20 18H4L7 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 21C5 17.4 8.2 15 12 15C15.8 15 19 17.4 19 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5C13.9 15.5 15.5 13.9 15.5 12C15.5 10.1 13.9 8.5 12 8.5C10.1 8.5 8.5 10.1 8.5 12C8.5 13.9 10.1 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 12C19 11.6 19 11.3 18.9 10.9L21 9.3L19 5.8L16.5 6.8C16 6.4 15.5 6.1 14.9 5.9L14.5 3H9.5L9.1 5.9C8.5 6.1 8 6.4 7.5 6.8L5 5.8L3 9.3L5.1 10.9C5 11.3 5 11.6 5 12C5 12.4 5 12.7 5.1 13.1L3 14.7L5 18.2L7.5 17.2C8 17.6 8.5 17.9 9.1 18.1L9.5 21H14.5L14.9 18.1C15.5 17.9 16 17.6 16.5 17.2L19 18.2L21 14.7L18.9 13.1C19 12.7 19 12.4 19 12Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function RankingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 18H7V21H4V18Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.5 13H13.5V21H10.5V13Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M17 8H20V21H17V8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 14L12 7L18 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 18L6 8L12 13L18 8L20 18H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function MountainIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M3 19L9 8L13 14L16 10L21 19H3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14H11L10 22L20 9H13L13 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L19 6V11C19 15.5 16.1 19.6 12 21C7.9 19.6 5 15.5 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M4 18H6V20H4V18Z" fill="currentColor" />
      <path d="M8 14H10V20H8V14Z" fill="currentColor" />
      <path d="M12 10H14V20H12V10Z" fill="currentColor" />
      <path d="M16 6H18V20H16V6Z" fill="currentColor" />
    </svg>
  )
}

function JacketIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M9 4L12 6L15 4L20 8L18 20H6L4 8L9 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 6V20" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function TentIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M3 20L12 4L21 20H3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 4V20" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SatelliteIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M7 14L10 17M5 19L8 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13 4L20 11L16 15L9 8L13 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 8L18 6M19 4L20 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}