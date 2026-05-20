// components/ResponsiveTable.tsx
'use client'

import { useEffect, useState, ReactNode } from 'react'

interface Column {
  key: string
  header: string
  render?: (value: any, item: any) => ReactNode
  mobileLabel?: string
  hideOnMobile?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface ResponsiveTableProps {
  columns: Column[]
  data: any[]
  keyExtractor: (item: any, index: number) => string
  onRowClick?: (item: any) => void
  emptyMessage?: string
  loading?: boolean
  className?: string
}

export default function ResponsiveTable({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Nenhum dado encontrado',
  loading = false,
  className = ''
}: ResponsiveTableProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getAlignStyle = (align?: string) => {
    switch (align) {
      case 'center': return { textAlign: 'center' as const, justifyContent: 'center' }
      case 'right': return { textAlign: 'right' as const, justifyContent: 'flex-end' }
      default: return { textAlign: 'left' as const, justifyContent: 'flex-start' }
    }
  }

  const renderCellValue = (column: Column, item: any) => {
    if (column.render) {
      return column.render(item[column.key], item)
    }
    return item[column.key] ?? '-'
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        backgroundColor: 'white', 
        borderRadius: '12px' 
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #e5e7eb', 
          borderTopColor: '#dc2626', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite', 
          margin: '0 auto 16px' 
        }} />
        <p style={{ color: '#6b7280' }}>Carregando dados...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px', 
        backgroundColor: 'white', 
        borderRadius: '12px' 
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>{emptyMessage}</p>
      </div>
    )
  }

  // Mobile view - Cards
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className={className}>
        {data.map((item, index) => {
          const visibleColumns = columns.filter(col => !col.hideOnMobile)
          
          return (
            <div
              key={keyExtractor(item, index)}
              onClick={() => onRowClick?.(item)}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {visibleColumns.map((column) => (
                <div
                  key={column.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <span style={{ 
                    fontWeight: '600', 
                    fontSize: '13px', 
                    color: '#6b7280',
                    flex: '0 0 40%'
                  }}>
                    {column.mobileLabel || column.header}
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#111827',
                    flex: '0 0 55%',
                    textAlign: 'right',
                    fontWeight: column.key === 'acoes' ? 'normal' : '500'
                  }}>
                    {renderCellValue(column, item)}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop view - Table
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px' }} className={className}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <thead>
          <tr style={{ 
            backgroundColor: '#f9fafb', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: '14px 16px',
                  textAlign: column.align || 'left',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#374151',
                  width: column.width || 'auto'
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item, index)}
              onClick={() => onRowClick?.(item)}
              style={{
                borderBottom: index === data.length - 1 ? 'none' : '1px solid #f3f4f6',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '14px 16px',
                    fontSize: '14px',
                    color: '#111827',
                    ...getAlignStyle(column.align)
                  }}
                >
                  {renderCellValue(column, item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}