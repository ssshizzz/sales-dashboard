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

  const cards = [...data.businesses, data.total];

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>売上状況ダッシュボード</h1>
          <p>前年比 / 月間売上</p>
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
    </div>
  );
}

function SalesGaugeCard({ item }) {
  const yoy = Number(item.yoy || 0);
  const sales = Number(item.sales || 0);

  return (
    <div className={`gauge-card ${item.business === "全社" ? "total" : ""}`}>
      <h2>{getIcon(item.business)} {item.business}</h2>

      <div className="gauge">
        <SpeedGauge value={yoy} />

        <div className="gauge-value">{yoy.toFixed(1)}%</div>
        <div className="gauge-label">前年比</div>
      </div>

      <div className="sales-box">
        <div className="sales-label">月間売上</div>
        <div className="sales-value">
          {sales.toLocaleString("ja-JP", { maximumFractionDigits: 0 })} 千円
        </div>
      </div>
    </div>
  );
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