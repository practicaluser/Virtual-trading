import React from 'react'

// 임시(Mock) 데이터
const myStocks = [
  {
    id: 1,
    name: '삼성전자',
    price: '75,000원',
    change: '1,200',
    isPositive: true,
  },
  {
    id: 2,
    name: 'SK하이닉스',
    price: '125,000원',
    change: '2,500',
    isPositive: false,
  },
  {
    id: 3,
    name: 'NAVER',
    price: '215,000원',
    change: '3,000',
    isPositive: true,
  },
  {
    id: 4,
    name: 'LG에너지솔루션',
    price: '450,000원',
    change: '8,000',
    isPositive: true,
  },
  {
    id: 5,
    name: '카카오',
    price: '55,000원',
    change: '500',
    isPositive: false,
  },
]

const MyStocksList: React.FC = () => {
  return (
    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">보유 종목 TOP 5</h3>
      <ul className="space-y-4">
        {myStocks.map((stock) => (
          <li key={stock.id} className="flex justify-between items-center">
            <span className="font-semibold">{`${stock.id}. ${stock.name}`}</span>
            <div>
              <span className="font-bold">{stock.price}</span>
              <span
                className={`ml-2 text-sm ${
                  stock.isPositive ? 'text-red-500' : 'text-blue-500'
                }`}
              >
                {stock.isPositive ? '▲' : '▼'} {stock.change}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MyStocksList
