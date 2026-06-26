'use client'

type Props = {
  value: string
  onChange: (isoDate: string, displayValue: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  minAge?: number
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 8)
}

function formatDateBR(raw: string) {
  const digits = onlyDigits(raw)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function brToIso(displayValue: string) {
  const digits = onlyDigits(displayValue)
  if (digits.length !== 8) return ''

  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4)
  const iso = `${yyyy}-${mm}-${dd}`
  const date = new Date(`${iso}T00:00:00`)

  if (Number.isNaN(date.getTime())) return ''
  if (date.getFullYear() !== Number(yyyy)) return ''
  if (date.getMonth() + 1 !== Number(mm)) return ''
  if (date.getDate() !== Number(dd)) return ''

  return iso
}

export function idadeEmAnos(isoDate: string) {
  if (!isoDate) return null
  const nascimento = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(nascimento.getTime())) return null

  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--
  return idade
}

export default function SimpleDateInput({
  value,
  onChange,
  label = 'Data de nascimento',
  placeholder = 'dd/mm/aaaa',
  required,
  minAge,
}: Props) {
  const iso = brToIso(value)
  const idade = idadeEmAnos(iso)
  const menorQueMinimo = typeof minAge === 'number' && idade !== null && idade < minAge

  return (
    <label className="simpleDateField">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        maxLength={10}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(event) => {
          const display = formatDateBR(event.target.value)
          onChange(brToIso(display), display)
        }}
      />
      {menorQueMinimo && <small>O cadastro é permitido apenas para maiores de {minAge} anos.</small>}

      <style>{styles}</style>
    </label>
  )
}

const styles = `
.simpleDateField {
  display: grid;
  gap: 8px;
}
.simpleDateField span {
  color: #203c2e;
  font-size: 13px;
  font-weight: 800;
}
.simpleDateField input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(32, 60, 46, .18);
  background: #fffdf7;
  color: #203c2e;
  padding: 14px 15px;
  outline: none;
  font-size: 16px;
}
.simpleDateField input:focus {
  border-color: rgba(212, 179, 90, .8);
  box-shadow: 0 0 0 4px rgba(212, 179, 90, .16);
}
.simpleDateField small {
  color: #dc2626;
  font-size: 12px;
  line-height: 1.4;
}
`
