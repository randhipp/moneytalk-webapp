import React, { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'
import { Transaction } from './Dashboard'
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
)

interface FinancialReportsProps {
  transactions: Transaction[]
}

export function FinancialReports({ transactions }: FinancialReportsProps) {
  const [viewType, setViewType] = useState<'weekly' | 'monthly'>('monthly')

  const { chartData, summary, categoryData } = useMemo(() => {
    const now = new Date()
    const isWeekly = viewType === 'weekly'
    
    // Get date range
    const startDate = isWeekly ? startOfWeek(now) : startOfMonth(now)
    const endDate = isWeekly ? endOfWeek(now) : endOfMonth(now)
    
    // Filter transactions for the period
    const periodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at)
      return transactionDate >= startDate && transactionDate <= endDate
    })

    // Calculate summary
    const totalIncome = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const netIncome = totalIncome - totalExpenses

    // Category breakdown
    const categoryBreakdown = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      }, {} as Record<string, number>)

    // Chart data
    let chartLabels: string[]
    let incomeData: number[]
    let expenseData: number[]

    if (isWeekly) {
      const days = eachDayOfInterval({ start: startDate, end: endDate })
      chartLabels = days.map(day => format(day, 'EEE'))
      
      incomeData = days.map(day => {
        return periodTransactions
          .filter(t => t.type === 'income' && format(new Date(t.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
          .reduce((sum, t) => sum + t.amount, 0)
      })

      expenseData = days.map(day => {
        return periodTransactions
          .filter(t => t.type === 'expense' && format(new Date(t.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
          .reduce((sum, t) => sum + t.amount, 0)
      })
    } else {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate })
      chartLabels = weeks.map((week, index) => `Week ${index + 1}`)
      
      incomeData = weeks.map(week => {
        const weekStart = startOfWeek(week)
        const weekEnd = endOfWeek(week)
        return periodTransactions
          .filter(t => {
            const date = new Date(t.created_at)
            return t.type === 'income' && date >= weekStart && date <= weekEnd
          })
          .reduce((sum, t) => sum + t.amount, 0)
      })

      expenseData = weeks.map(week => {
        const weekStart = startOfWeek(week)
        const weekEnd = endOfWeek(week)
        return periodTransactions
          .filter(t => {
            const date = new Date(t.created_at)
            return t.type === 'expense' && date >= weekStart && date <= weekEnd
          })
          .reduce((sum, t) => sum + t.amount, 0)
      })
    }

    return {
      chartData: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Expenses',
            data: expenseData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
          },
        ],
      },
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        period: isWeekly ? 'This Week' : 'This Month'
      },
      categoryData: {
        labels: Object.keys(categoryBreakdown),
        datasets: [
          {
            data: Object.values(categoryBreakdown),
            backgroundColor: [
              '#3B82F6',
              '#8B5CF6',
              '#10B981',
              '#F59E0B',
              '#EF4444',
              '#6366F1',
              '#EC4899',
              '#14B8A6',
              '#F97316',
              '#84CC16',
              '#06B6D4',
              '#8B5A2B',
            ],
            borderWidth: 0,
          },
        ],
      },
    }
  }, [transactions, viewType])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Income vs Expenses - ${summary.period}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toFixed(0)
          }
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: `Expense Breakdown - ${summary.period}`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((context.raw / total) * 100).toFixed(1)
            return `${context.label}: $${context.raw.toFixed(2)} (${percentage}%)`
          }
        }
      }
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Financial Reports</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewType('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewType('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{summary.period} Income</p>
              <p className="text-2xl font-bold text-green-600">${summary.totalIncome.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{summary.period} Expenses</p>
              <p className="text-2xl font-bold text-red-600">${summary.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Income</p>
              <p className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${summary.netIncome.toFixed(2)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              summary.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.totalIncome > 0 ? ((summary.netIncome / summary.totalIncome) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <Line data={chartData} options={chartOptions} />
        </div>

        {categoryData.labels.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <Doughnut data={categoryData} options={doughnutOptions} />
          </div>
        )}
      </div>

      {/* Category Details */}
      {categoryData.labels.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h4>
          <div className="space-y-3">
            {categoryData.labels.map((category, index) => {
              const amount = categoryData.datasets[0].data[index] as number
              const percentage = ((amount / summary.totalExpenses) * 100).toFixed(1)
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: categoryData.datasets[0].backgroundColor[index] }}
                    />
                    <span className="font-medium text-gray-900">{category}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}