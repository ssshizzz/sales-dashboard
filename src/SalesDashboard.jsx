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

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>{formatSalesDate(data.salesDate)} 売上状況ダッシュボード</h1>
        </div>
        <div className="updated">
          更新日時：{formatDateTime(data.updatedAt)}
        </div>
      </div>

      <div className="gauge-grid">
        {cards.map((item) => (
          <SalesGaugeCard key={item.business} item={item} />
        ))}
      </div>

      <RankingSection rankings={data.rankings} />

      <SalesTrendSection trendChart={data.trendChart || []} />
    </div>
  );
}

function SalesGaugeCard({ item }) {
  const yoy = safeNumber(item.yoy);
  const sales = safeNumber(item.sales);

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
      </div>
    </div>
  );
}

function SalesTrendSection({ trendChart }) {
  const rows = (trendChart || []).map((row) => ({
    month: formatMonthLabel(row.month),
    sushi: safeNumber(row.sushiCumulative),
    fugu: safeNumber(row.fuguCumulative),
    total: safeNumber(row.totalCumulative)
  }));

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="trend-section">
      <h2>期初から期末までの累積売上推移【開発中】</h2>

      <div className="trend-legend">
        <span>🍣 寿司</span>
        <span>🐡 ふぐ</span>
        <span>🏢 全社</span>
      </div>

      <FiscalYearLineChart rows={rows} />
    </div>
  );
}

function FiscalYearLineChart({ rows }) {
  const width = 1000;
  const height = 320;
  const padding = 60;

  const max = Math.max(
    ...rows.flatMap((row) => [row.sushi, row.fugu, row.total]),
    1
  );

  const sushiPoints = buildChartPoints(rows, "sushi", width, height, padding, max);
  const fuguPoints = buildChartPoints(rows, "fugu", width, height, padding, max);
  const totalPoints = buildChartPoints(rows, "total", width, height, padding, max);

  const monthLabels = [
    "10月", "11月", "12月",
    "1月", "2月", "3月",
    "4月", "5月", "6月",
    "7月", "8月", "9月"
  ];

  const scaleLabels = [];
  for (let i = 0; i <= 5; i++) {
    scaleLabels.push(Math.round(max * (5 - i) / 5));
  }

  return (
    <div className="trend-card">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart">
        {monthLabels.map((label, idx) => (
         <text
           key={label}
           x={padding + (idx * (width - padding * 2) / 11)}
           y={height - 15}
           className="axis-label"
         >
          {label}
         </text>
))}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="trend-axis" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="trend-axis" />

        {scaleLabels.map((value, idx) => (
          <text
            key={`scale-${idx}`}
            x={padding - 10}
            y={padding + idx * ((height - padding * 2) / 5)}
            className="axis-label y-axis-label"
          >
            {(value / 100000).toFixed(0)}億
          </text>
        ))}

        {monthLabels.map((label, idx) => (
          <text
            key={label}
            x={padding + (idx * (width - padding * 2) / 11)}
            y={height - 18}
            className="axis-label x-axis-label"
          >
            {label}
          </text>
        ))}

        <path d={pointsToPath(sushiPoints)} className="trend-line sushi" fill="none" />
        <path d={pointsToPath(fuguPoints)} className="trend-line fugu" fill="none" />
        <path d={pointsToPath(totalPoints)} className="trend-line total" fill="none" />

        {totalPoints.map((point) => (
          <circle key={`total-${point.month}`} cx={point.x} cy={point.y} r="4" className="trend-point total">
            <title>{point.month} 全社：{Math.round(point.value).toLocaleString("ja-JP")} 千円</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function buildChartPoints(rows, key, width, height, padding, max) {
  return rows.map((row, index) => {
    const value = safeNumber(row[key]);
    const x = padding + (index / Math.max(rows.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);

    return {
      month: row.month,
      value,
      x,
      y
    };
  });
}

function pointsToPath(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function formatMonthLabel(value) {
  const str = String(value);
  return `${Number(str.slice(4, 6))}月`;
}




function buildFiscalYearMonthlyTrendRows(trends, salesDate) {
  if (!salesDate) return [];

  const baseDate = String(salesDate);
  const year = Number(baseDate.slice(0, 4));
  const month = Number(baseDate.slice(4, 6));

  const fiscalStartYear = month >= 10 ? year : year - 1;
  const start = Number(`${fiscalStartYear}1001`);
  const end = Number(`${fiscalStartYear + 1}0930`);

  const map = new Map();

  (trends || [])
    .filter((row) => {
      const d = Number(row.salesDate);
      return d >= start && d <= end;
    })
    .forEach((row) => {
      const key = String(row.salesDate);
      const current = map.get(key) || {
        salesDate: key,
        label: formatShortDate(key),
        sushi: null,
        fugu: null
      };

      if (row.business === "寿司") {
        current.sushi = safeNumber(row.yearlySales);
      }

      if (row.business === "ふぐ") {
        current.fugu = safeNumber(row.yearlySales);
      }

      map.set(key, current);
    });

  return Array.from(map.values())
    .sort((a, b) => Number(a.salesDate) - Number(b.salesDate));
}



function RankingSection({ rankings }) {
  if (!rankings) {
    return <div style={{ color: "white" }}>ランキングデータなし</div>;
  }

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
          {rows.map((row) => {
            const yoy = safeNumber(row.yoy);

            return (
              <tr key={`${title}-${row.rank}-${row.store}`}>
                <td>{row.rank}</td>
                <td>{row.store}</td>
                <td>{formatSalesValue(row.sales, "thousand")}</td>
                <td className={yoy >= 100 ? "good" : "bad"}>
                  {yoy.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SpeedGauge({ value }) {
  const min = 80;
  const redEnd = 95;
  const yellowEnd = 100;
  const max = 120;

  const clamped = Math.min(Math.max(safeNumber(value), min), max);

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
      sales: row?.monthlySales ?? 0,
      dailySales: row?.dailySales ?? 0,
      yearlySales: row?.yearlySales ?? 0,
      yoy: row?.yoy ?? 0,
      unitType: "thousand"
    };
  });
}

function formatSalesDate(value) {
  if (!value) return "";

  const str = String(value);
  return `${Number(str.slice(0, 4))}年${Number(str.slice(4, 6))}月${Number(str.slice(6, 8))}日`;
}

function formatShortDate(value) {
  const str = String(value);
  return `${Number(str.slice(4, 6))}/${Number(str.slice(6, 8))}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ja-JP");
}

function formatSalesValue(value, unitType) {
  const sales = safeNumber(value);

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

function safeNumber(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
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