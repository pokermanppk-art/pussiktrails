'use client'

import { useCallback, useEffect, useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'

type AvatarCropModalProps = {
  open: boolean
  imageSrc: string
  title?: string
  onCancel: () => void
  onConfirm: (file: File) => Promise<void> | void
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Não foi possível carregar a imagem.')))

    if (!url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous')
    }

    image.src = url
  })
}

async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: Area,
  fileName = 'avatar.webp'
): Promise<File> {
  const image = await createImage(imageSrc)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Não foi possível preparar a imagem.')
  }

  const outputSize = 900

  canvas.width = outputSize
  canvas.height = outputSize

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  )

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      (result) => resolve(result),
      'image/webp',
      0.86
    )
  })

  if (!blob) {
    throw new Error('Não foi possível gerar a imagem recortada.')
  }

  return new File([blob], fileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

export default function AvatarCropModal({
  open,
  imageSrc,
  title = 'Ajustar foto',
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.15)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return

    setCrop({ x: 0, y: 0 })
    setZoom(1.15)
    setCroppedAreaPixels(null)
    setErro('')
  }, [open, imageSrc])

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function confirmar() {
    if (!croppedAreaPixels) {
      setErro('Ajuste a imagem antes de salvar.')
      return
    }

    try {
      setErro('')
      setSalvando(true)

      const file = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        `avatar-${Date.now()}.webp`
      )

      await onConfirm(file)
    } catch (error: unknown) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível ajustar a imagem.'

      setErro(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  if (!open) return null

  return (
    <div className="cropOverlay" role="dialog" aria-modal="true">
      <div className="cropModal">
        <div className="cropHeader">
          <div>
            <p>Ajuste de perfil</p>
            <h2>{title}</h2>
            <span>Arraste a foto e use o zoom para enquadrar melhor.</span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={salvando}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="cropArea">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="zoomBox">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </div>

        {erro && <div className="cropError">{erro}</div>}

        <div className="cropActions">
          <button
            type="button"
            className="cropSecondary"
            onClick={onCancel}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="cropPrimary"
            onClick={confirmar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Usar esta foto'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .cropOverlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(8, 13, 7, 0.58);
          backdrop-filter: blur(10px);
        }

        .cropModal {
          width: min(520px, 100%);
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.56);
          background:
            radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.16), transparent 30%),
            linear-gradient(180deg, #fffdf7 0%, #f3f5ea 100%);
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.34);
          padding: 18px;
        }

        .cropHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .cropHeader p {
          margin: 0 0 5px;
          color: #991b1b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .cropHeader h2 {
          margin: 0;
          color: #172018;
          font-size: 26px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .cropHeader span {
          display: block;
          margin-top: 7px;
          color: rgba(23, 32, 24, 0.62);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 700;
        }

        .cropHeader button {
          width: 38px;
          height: 38px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.76);
          color: #172018;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
        }

        .cropArea {
          position: relative;
          width: 100%;
          height: min(62vw, 380px);
          min-height: 300px;
          overflow: hidden;
          border-radius: 26px;
          background: #172018;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .zoomBox {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
        }

        .zoomBox span {
          color: #475569;
          font-size: 12px;
          font-weight: 900;
        }

        .zoomBox input {
          width: 100%;
          accent-color: #991b1b;
        }

        .cropError {
          margin-top: 12px;
          border-radius: 16px;
          background: rgba(153, 27, 27, 0.08);
          border: 1px solid rgba(153, 27, 27, 0.18);
          color: #7f1d1d;
          padding: 11px 12px;
          font-size: 13px;
          font-weight: 800;
        }

        .cropActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }

        .cropPrimary,
        .cropSecondary {
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
        }

        .cropPrimary {
          border: 0;
          background: #991b1b;
          color: #fffdf7;
          box-shadow: 0 14px 28px rgba(153, 27, 27, 0.22);
        }

        .cropSecondary {
          background: rgba(255, 255, 255, 0.75);
          color: #27321f;
          border: 1px solid rgba(62, 74, 45, 0.12);
        }

        .cropPrimary:disabled,
        .cropSecondary:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        @media (max-width: 520px) {
          .cropOverlay {
            align-items: flex-end;
            padding: 10px;
          }

          .cropModal {
            border-radius: 26px;
          }

          .cropArea {
            height: 340px;
            min-height: 300px;
          }

          .cropActions {
            flex-direction: column-reverse;
          }

          .cropPrimary,
          .cropSecondary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
