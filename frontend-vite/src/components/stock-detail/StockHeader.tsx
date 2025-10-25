// import React from 'react'

// // 임시 데이터 타입. 실제로는 API 응답에 맞춰야 합니다.
// interface StockHeaderProps {
//   name: string
//   code: string
//   price: string
//   changeValue: string
//   changeRate: string
//   isPositive: boolean
// }

// const StockHeader: React.FC<StockHeaderProps> = ({
//   name,
//   code,
//   price,
//   changeValue,
//   changeRate,
//   isPositive,
// }) => {
//   const textColor = isPositive ? 'text-red-500' : 'text-blue-500'
//   const changeIcon = isPositive ? '▲' : '▼'

//   return (
//     <div className="bg-white p-6 rounded-xl shadow-md">
//       {/* 상단: 종목 정보 및 가격 */}
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-3xl font-bold">{name}</h1>
//           <p className="text-gray-500">{code}</p>
//         </div>
//         <div className="text-right">
//           <h1 className={`text-4xl font-bold ${textColor}`}>{price}</h1>
//           <p className={`font-semibold ${textColor}`}>
//             {changeIcon} {changeValue} ({changeRate})
//           </p>
//         </div>
//       </div>

//       {/* 하단: 매수/매도 버튼 */}
//       <div className="grid grid-cols-2 gap-4">
//         <button className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors">
//           매수
//         </button>
//         <button className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
//           매도
//         </button>
//       </div>
//     </div>
//   )
// }

// export default StockHeader

import React from 'react'

// 임시 데이터 타입. 실제로는 API 응답에 맞춰야 합니다.
interface StockHeaderProps {
  name: string
  code: string
  price: string
  changeValue: string
  changeRate: string
  isPositive: boolean
  onBuyClick: () => void // 모달을 열기 위한 함수
  onSellClick: () => void // 모달을 열기 위한 함수
}

const StockHeader: React.FC<StockHeaderProps> = ({
  name,
  code,
  price,
  changeValue,
  changeRate,
  isPositive,
  onBuyClick,
  onSellClick,
}) => {
  const textColor = isPositive ? 'text-red-500' : 'text-blue-500'
  const changeIcon = isPositive ? '▲' : '▼'

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* 상단: 종목 정보 및 가격 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-500">{code}</p>
        </div>
        <div className="text-right">
          <h1 className={`text-4xl font-bold ${textColor}`}>{price}</h1>
          <p className={`font-semibold ${textColor}`}>
            {changeIcon} {changeValue} ({changeRate})
          </p>
        </div>
      </div>

      {/* 하단: 매수/매도 버튼 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onBuyClick}
          className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
        >
          매수
        </button>
        <button
          onClick={onSellClick}
          className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
        >
          매도
        </button>
      </div>
    </div>
  )
}

export default StockHeader
