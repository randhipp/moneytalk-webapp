import React, { useState } from 'react'
import { format } from 'date-fns'
import { Download, FileText, Calendar, Filter } from 'lucide-react'
import { Transaction } from './Dashboard'

interface ExportDataProps {
  transactions: Transaction[]
}

export function ExportData({ transactions }: ExportDataProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'year'>('all')
  const [includeCategories, setIncludeCategories] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  const categories = [...new Set(transactions.map(t => t.category))]

  const getFilteredTransactions = () => {
    let filtered = transactions

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()
      
      if (dateRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1)
      } else if (dateRange === 'year') {
        cutoffDate.setFullYear(now.getFullYear() - 1)
      }
      
      filtered = filtered.filter(t => new Date(t.created_at) >= cutoffDate)
    }

    // Filter by categories
    if (includeCategories.length > 0) {
      filtered = filtered.filter(t => includeCategories.includes(t.category))
    }

    return filtered
  }

  const exportAsCSV = (data: Transaction[]) => {
    const headers = [
      'Date',
      'Type',
      'Category',
      'Amount',
      'Description',
      'Audio Transcript'
    ]

    const csvContent = [
      headers.join(','),
      ...data.map(transaction =>
        [
          format(new Date(transaction.created_at), 'yyyy-MM-dd HH:mm:ss'),
          transaction.type,
          transaction.category,
          transaction.amount.toFixed(2),
          `"${transaction.description.replace(/"/g, '""')}"`,
          `"${(transaction.audio_transcript || '').replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n')

    return csvContent
  }

  const exportAsJSON = (data: Transaction[]) => {
    const exportData = data.map(transaction => ({
      date: format(new Date(transaction.created_at), 'yyyy-MM-dd HH:mm:ss'),
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description,
      audioTranscript: transaction.audio_transcript || ''
    }))

    return JSON.stringify(exportData, null, 2)
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const filteredData = getFilteredTransactions()
      
      if (filteredData.length === 0) {
        alert('No transactions match your filter criteria')
        return
      }

      let content: string
      let filename: string
      let mimeType: string

      if (exportFormat === 'csv') {
        content = exportAsCSV(filteredData)
        filename = `financial-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
        mimeType = 'text/csv'
      } else {
        content = exportAsJSON(filteredData)
        filename = `financial-transactions-${format(new Date(), 'yyyy-MM-dd')}.json`
        mimeType = 'application/json'
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const toggleCategory = (category: string) => {
    setIncludeCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const filteredCount = getFilteredTransactions().length

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Export Financial Data</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Export Your Financial Data</h4>
            <p className="text-sm text-blue-700 mt-1">
              Download your transaction history in CSV or JSON format. Perfect for importing into spreadsheet applications or personal finance software.
            </p>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value as 'csv')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">CSV</div>
                <div className="text-sm text-gray-500">Compatible with Excel, Google Sheets</div>
              </div>
            </label>
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportFormat === 'json'}
                onChange={(e) => setExportFormat(e.target.value as 'json')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">JSON</div>
                <div className="text-sm text-gray-500">For developers and data analysis</div>
              </div>
            </label>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="w-4 h-4 inline mr-2" />
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'all' | 'month' | 'year')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Filter className="w-4 h-4 inline mr-2" />
              Categories (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{category}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => setIncludeCategories(categories)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <button
                onClick={() => setIncludeCategories([])}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Export Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Export Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Format: {exportFormat.toUpperCase()}</p>
            <p>Date Range: {dateRange === 'all' ? 'All Time' : dateRange === 'month' ? 'Last Month' : 'Last Year'}</p>
            <p>Categories: {includeCategories.length === 0 ? 'All Categories' : `${includeCategories.length} selected`}</p>
            <p className="font-medium text-gray-900">Total Transactions: {filteredCount}</p>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || filteredCount === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export {filteredCount} Transactions</span>
            </>
          )}
        </button>

        {filteredCount === 0 && (
          <p className="text-center text-gray-500 text-sm">
            No transactions match your current filter criteria
          </p>
        )}
      </div>

      {/* Export Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Export Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
          <li>• JSON files are perfect for custom data analysis or importing into other applications</li>
          <li>• All exported data includes transaction dates, amounts, categories, and descriptions</li>
          <li>• Audio transcripts are included when available</li>
        </ul>
      </div>
    </div>
  )
}