import { useParams, useLocation, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Simple demo carbon factor (kg CO2e per kWh). DO NOT use for real reporting.
const EF_GRID = 0.45;

const COLORS = {
  home: "#22d3ee", // cyan
  solar: "#34d399", // emerald
  grid: "#f59e0b", // amber
  bg: "#0f172a", // slate-900
  card: "#111827", // gray-900
  accent: "#14b8a6", // teal
};

function useDigitsToKwh(code) {
  const s = String(code || "").replace(/\D/g, "").padStart(3, "0").slice(0, 3);
  const [h, sol, g] = s.split("").map(Number);
  return { code: s, homeKWh: h, solarKWh: sol, gridKWh: g };
}

function buildSeries(homeKWh, solarKWh, gridKWh) {
  // deterministic mini time series from digits
  const pts = 12;
  const out = [];
  for (let i = 0; i < pts; i++) {
    const t = i + 1;
    out.push({
      t: `W${t}`,
      temperature: Math.max(0, solarKWh + Math.round(Math.sin((t / 3) * Math.PI) * (solarKWh / 2))),
      humidity: Math.max(0, homeKWh + Math.round(Math.cos((t / 4) * Math.PI) * (homeKWh / 2))),
      grid: Math.max(0, gridKWh + Math.round(Math.sin((t / 5) * Math.PI) * (gridKWh / 2))),
    });
  }
  return out;
}

function allocSolarFlows(solarKWh) {
  // split solar into: toBattery (11%), toHome (19%), toGrid (rest)
  const toBattery = Math.floor(solarKWh * 0.11);
  const toHome = Math.floor(solarKWh * 0.19);
  const toGrid = Math.max(solarKWh - toBattery - toHome, 0);
  return { toBattery, toHome, toGrid };
}

function allocHomeSources(homeKWh, fromSolar, fromBattery) {
  const s = Math.min(fromSolar, Math.floor(homeKWh * 0.4));
  const b = Math.min(fromBattery, Math.floor(homeKWh * 0.25));
  const g = Math.max(homeKWh - s - b, 0);
  return { fromSolar: s, fromBattery: b, fromGrid: g };
}

export default function DashboardCharts() {
  const { code } = useParams();
  const { state } = useLocation();
  // const code = "333";
  // const state = {
  //   filename: 'something333.ifc',
  //   location: {
  //       lat: -36.80837,
  //       lng: 174.72353
  //   }
  // }
  const { code: normalized, homeKWh, solarKWh, gridKWh } = useDigitsToKwh(code);

  const { toBattery, toHome, toGrid } = allocSolarFlows(solarKWh);
  const { fromSolar, fromBattery, fromGrid } = allocHomeSources(homeKWh, toHome, toBattery);

  const totalKWh = homeKWh + solarKWh + gridKWh;
  const emissionsKg = (homeKWh + gridKWh) * EF_GRID;
  const avoidedKg = solarKWh * EF_GRID;

  const series = buildSeries(homeKWh, solarKWh, gridKWh);
  const daySeries = Array.from({ length: 10 }, (_, i) => ({
    t: `${i}:00`,
    toHome: Math.max(0, Math.round((toHome / 5) * Math.sin((i / 3) * Math.PI) + toHome / 2)),
    orientation: Math.max(0, Math.round((toGrid / 5) * Math.cos((i / 3) * Math.PI) + toGrid / 2)),
  }));

  const solarPie = [
    { name: "To Battery", value: toBattery },
    { name: "To Home", value: toHome },
    { name: "To Grid", value: toGrid },
  ];
  const homePie = [
    { name: "From Solar", value: fromSolar },
    { name: "From Battery", value: fromBattery },
    { name: "From Grid", value: fromGrid },
  ];

  const gridBar = [
    { name: "Grid", fromGrid: gridKWh, toGrid },
  ];

  const gaugeVal = Math.min(100, toBattery * 10); // toy SOC gauge: 0–100

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Energy management and projection</h1>
            <p className="text-slate-300 text-sm">
              Code: {normalized}
              {state?.fileName ? ` · ${state.fileName}` : ""}
              {state?.location ? ` · ${state.location.lat.toFixed(4)}, ${state.location.lng.toFixed(4)}` : ""}
            </p>
          </div>
          <Link to="/" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">← Back</Link>
        </header>

        {/* Top grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Solar value & revenue */}
          <Card title="Weather & Climate" subtitle="Toy series">
            <ResponsiveContainer width="100%" height={224}>
                <LineChart data={series}>
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke={COLORS.home} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="humidity" stroke={COLORS.grid} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
          </Card>

          {/* Day/Week flows */}
          <Card title="Shading">
            <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={daySeries}>
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area dataKey="toHome" type="monotone" fill={COLORS.home} stroke={COLORS.home} fillOpacity={0.3} />
                  <Area dataKey="orientation" type="monotone" fill={COLORS.grid} stroke={COLORS.grid} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
          </Card>

          {/* Environmental benefits */}
          <Card title="Environmental benefits" subtitle={`Accumulated power generation (kWh): ${solarKWh}`}>
            <div className="grid grid-cols-3 gap-3">
              <Benefit label="Standard coal saved (t)" value={(solarKWh * 0.0003).toFixed(2)} />
              <Benefit label="CO₂ avoided (t)" value={(avoidedKg / 1000).toFixed(2)} />
              <Benefit label="Equivalent trees" value={Math.round(avoidedKg / 21)} />
            </div>
          </Card>
        </section>

        {/* Middle grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grid net exported */}
          <Card title="Grid – Net Exported (kWh)">
            <ResponsiveContainer width="100%" height={192}>
                <BarChart data={gridBar}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="toGrid" stackId="a" fill={COLORS.home} />
                  <Bar dataKey="fromGrid" stackId="a" fill={COLORS.grid} />
                </BarChart>
              </ResponsiveContainer>
            <div className="text-right text-sm text-slate-300 pr-1">Net exported: {Math.max(toGrid - gridKWh, 0)}</div>
          </Card>

          {/* Solar donut */}
          <Card title="Solar (kWh)" subtitle={`${solarKWh} generated`}>
            <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie data={solarPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {solarPie.map((_, i) => (
                      <Cell key={i} fill={[COLORS.accent, COLORS.home, COLORS.grid][i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} kWh`} />
                </PieChart>
              </ResponsiveContainer>
            <LegendInline items={[
              { label: "To Battery", color: COLORS.accent, val: toBattery },
              { label: "To Home", color: COLORS.home, val: toHome },
              { label: "To Grid", color: COLORS.grid, val: toGrid },
            ]} />
          </Card>

          {/* Work orders */}
          <Card title="Work orders">
            <div className="grid grid-cols-2 gap-3 text-center">
              <KPI label="Executing" value={(solarKWh % 5) + 1} />
              <KPI label="Finished" value={(homeKWh % 5) + 1} />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.card }}>
      <div className="mb-2">
        <div className="text-sm text-slate-300">{title}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function LegendInline({ items }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: it.color }} />
          <span>{it.label}</span>
          <span className="ml-auto text-slate-400">{it.val} kWh</span>
        </div>
      ))}
    </div>
  );
}

function Benefit({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800 p-4 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}