import React from 'react'

interface PageHeaderProps {
  title: string
  extra?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, extra }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--margin-loose)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-extra-large)',
          fontWeight: 'var(--font-weight-medium)',
          margin: 0,
        }}
      >
        {title}
      </h1>
      {extra}
    </div>
  )
}

export default PageHeader
