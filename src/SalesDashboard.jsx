import { useEffect, useState } from "react";
import "./SalesDashboard.css";

const API_URL = "https://script.google.com/macros/s/AKfycbzh2LgvIZc_ai3BPZ5L3av8s3M8EAzKSEvP6mYYi9Fc53OqdE3v1VKUeuKuegosBMH-/exec";

export default function SalesDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("売上データ取得エラー", err));
  }, []);

  if (!data) {
    return <div className="sales-page">読み込み中...</div>;
  }

 const cards = buildMainGaugeCards(data);
 const trendCount = data.trends?.length || 0;
 const latestTrendDate =
  data.trends?.length > 0
    ? data.trends[data.trends.length - 1].salesDate
    : "";
 const summaryCards = buildSummaryCards(data);
  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>{formatSalesDate(data.salesDate)} 売上状況ダッシュボード</h1>

        </div>
        <div className="updated">
          更新日時：{new Date(data.updatedAt).toLocaleString("ja-JP")}
        </div>
      </div>

      <div className="gauge-grid">
        {cards.map((item) => (
        <SalesGaugeCard key={item.business} item={item} />
        ))}
      </div>
      <div className="history-status-card">
       <h3>📈 履歴データ状況</h3>

       <div className="history-status-row">
         <div>
           <span>履歴件数</span>
           <strong>{trendCount}</strong>
         </div>

        <div>
          <span>最新履歴日</span>
          <strong>{latestTrendDate}</strong>
        </div>
    </div>
</div>
       <RankingSection rankings={data.rankings} />
    </div>
  );
}

function formatSalesDate(value) {
  if (!value) return "";

  const str = String(value);

  return `${Number(str.slice(0,4))}年${Number(str.slice(4,6))}月${Number(str.slice(6,8))}日`;
}


function SalesGaugeCard({ item }) {
  const yoy = Number(item.yoy || 0);
  const sales = Number(item.sales || 0);

  return (
    <div className={`gauge-card ${item.business === "全社" ? "total" : ""}`}>
    <h2>{getIcon(item.business)} {item.business} {item.period}</h2>

<div className="gauge-body">

  <div className="gauge-main">

    <div className="gauge">
      <SpeedGauge value={yoy} />

      <div className="gauge-value">{yoy.toFixed(1)}%</div>
      <div className="gauge-label">前年比</div>
    </div>

    <div className="sales-box">
      <div className="sales-label">月間売上</div>
      <div className="sales-value">
        {formatSalesValue(sales, item.unitType)}
      </div>
    </div>

  </div>

  <div className="side-stats">

    <div className="stat-card">
      <div className="stat-label">当日売上</div>
      <div className="stat-value">
        {formatSalesValue(item.dailySales, "thousand")}
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-label">年累計</div>
      <div className="stat-value">
        {formatSalesValue(item.yearlySales, "million")}
      </div>
    </div>

  </div>

</div>    </div>
  );
}

function formatSalesValue(value, unitType) {
  const sales = Number(value || 0);

  if (unitType === "million") {
    return `${(sales / 100).toLocaleString("ja-JP", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} 億円`;
  }

  return `${sales.toLocaleString("ja-JP", {
    maximumFractionDigits: 0
  })} 千円`;
}

function SpeedGauge({ value }) {
  const min = 80;
  const redEnd = 95;
  const yellowEnd = 100;
  const max = 120;

  const clamped = Math.min(Math.max(value, min), max);

  const angleFromValue = (v) => {
    return -90 + ((v - min) / (max - min)) * 180;
  };

  const needleAngle = angleFromValue(clamped);

  const describeArc = (startValue, endValue) => {
    const cx = 180;
    const cy = 180;
    const r = 135;

    const startAngle = angleFromValue(startValue);
    const endAngle = angleFromValue(endValue);

    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  return (
    <svg className="speed-gauge" viewBox="0 0 360 230">
      <path className="gauge-track red" d={describeArc(min, redEnd)} />
      <path className="gauge-track yellow" d={describeArc(redEnd, yellowEnd)} />
      <path className="gauge-track green" d={describeArc(yellowEnd, max)} />

      <g transform={`rotate(${needleAngle} 180 180)`}>
        <line x1="180" y1="180" x2="180" y2="70" className="gauge-needle" />
      </g>

      <circle cx="180" cy="180" r="10" className="gauge-center" />
    </svg>
  );
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;

  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians)
  };
}
function getIcon(name) {
  if (name.includes("ふぐ")) return "🐡";
  if (name.includes("寿司")) return "🍣";
  return "🏢";
}

function buildGaugeCards(data) {
  const rows = [
    ...(data.businesses || []),
    data.total
  ].filter(Boolean);

  const order = ["ふぐ", "寿司", "全社"];

  return order.flatMap((businessName) => {
    const row = rows.find((item) => item.business === businessName);

    if (!row) return [];

    return [
      {
        business: businessName,
        period: "当日",
        sales: row.dailySales,
        yoy: row.yoy,
        unitType: "thousand"
      },
      {
        business: businessName,
        period: "月間",
        sales: row.monthlySales,
        yoy: row.yoy,
        unitType: "thousand"
      },
      {
        business: businessName,
        period: "年累計",
        sales: row.yearlySales,
        yoy: row.yoy,
        unitType: "million"
      }
    ];
  });
}

function RankingSection({ rankings }) {
   console.log("rankings", rankings);
if (!rankings) return <div style={{ color: "white" }}>ランキングデータなし</div>;
//  if (!rankings) return null;

  return (
    <div className="ranking-section">
      <h2>店舗前年比ランキング TOP10</h2>

      <div className="ranking-grid">
        <RankingTable title="🍣 寿司 TOP10" rows={rankings.sushi || []} />
        <RankingTable title="🐡 ふぐ TOP10" rows={rankings.fugu || []} />
      </div>
    </div>
  );
}

function RankingTable({ title, rows }) {
  return (
    <div className="ranking-card">
      <h3>{title}</h3>

      <table>
        <thead>
          <tr>
            <th>順位</th>
            <th>店舗</th>
            <th>月間売上</th>
            <th>前年比</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.rank}-${row.store}`}>
              <td>{row.rank}</td>
              <td>{row.store}</td>
              <td>{Number(row.sales).toLocaleString("ja-JP", { maximumFractionDigits: 0 })} 千円</td>
              <td className={row.yoy >= 100 ? "good" : "bad"}>
                {Number(row.yoy).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildMainGaugeCards(data) {
  const rows = [
    ...(data.businesses || []),
    data.total
  ].filter(Boolean);

  const order = ["ふぐ", "寿司", "全社"];

  return order.map((businessName) => {
    const row = rows.find((item) => item.business === businessName);

 return {
  business: businessName,
  period: "月間",
  sales: row?.monthlySales || 0,
  dailySales: row?.dailySales || 0,
  yearlySales: row?.yearlySales || 0,
  yoy: row?.yoy || 0,
  unitType: "thousand"
};
  });
}

function buildSummaryCards(data) {
  const rows = [
    ...(data.businesses || []),
    data.total
  ].filter(Boolean);

  const order = ["ふぐ", "寿司", "全社"];

  return order.map((businessName) => {
    const row = rows.find((item) => item.business === businessName);

    return {
      business: businessName,
      dailySales: row?.dailySales || 0,
      yearlySales: row?.yearlySales || 0
    };
  });
}

