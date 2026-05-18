// src/Components/Calendar.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiClock, FiUser } from "react-icons/fi";
import { fetchTasks } from "../BACKEND/utils/api";
import { getTaskColor } from "../BACKEND/utils/colorMapper";

/* ── Layout constants ─────────────────────────────────────── */
const STRIP_H = 36;
const STRIP_GAP = 6;
const DATE_AREA_H = 36;
const CELL_PAD_T = 6;
const STRIP_TOP = CELL_PAD_T + DATE_AREA_H + 6;
const STRIP_ROW = STRIP_H + STRIP_GAP;
const SIDE_PAD = 0;
const BOTTOM_PAD = 12;

/* ── Color Definitions ───────────────────────────────────── */
const COLOR_BG = {
    violet: "rgba(139,92,246,0.15)", sky: "rgba(14,165,233,0.15)",
    pink: "rgba(236,72,153,0.15)", yellow: "rgba(250,204,21,0.18)",
    green: "rgba(34,197,94,0.15)", emerald: "rgba(16,185,129,0.15)",
    amber: "rgba(245,158,11,0.18)", indigo: "rgba(99,102,241,0.15)",
    rose: "rgba(244,63,94,0.15)", cyan: "rgba(6,182,212,0.15)",
    teal: "rgba(20,184,166,0.15)", lime: "rgba(132,204,22,0.15)",
};

const COLOR_BORDER = {
    violet: "#7c3aed", sky: "#0284c7", pink: "#db2777",
    yellow: "#d97706", green: "#16a34a", emerald: "#059669",
    amber: "#d97706", indigo: "#4338ca", rose: "#e11d48",
    cyan: "#0891b2", teal: "#0d9488", lime: "#65a30d",
};

const COLOR_TEXT = {
    violet: "#5b21b6", sky: "#0369a1", pink: "#9d174d",
    yellow: "#92400e", green: "#14532d", emerald: "#064e3b",
    amber: "#78350f", indigo: "#312e81", rose: "#881337",
    cyan: "#164e63", teal: "#134e4a", lime: "#365314",
};

const COLOR_DOT = {
    violet: "#8b5cf6", sky: "#0ea5e9", pink: "#ec4899",
    yellow: "#facc15", green: "#22c55e", emerald: "#10b981",
    amber: "#f59e0b", indigo: "#6366f1", rose: "#f43f5e",
    cyan: "#06b6d4", teal: "#14b8a6", lime: "#84cc16",
};

const COLOR_PILL_BG = {
    violet: "bg-violet-500/15",
    sky: "bg-sky-500/15",
    pink: "bg-pink-500/15",
    yellow: "bg-yellow-500/15",
    green: "bg-green-500/15",
    emerald: "bg-emerald-500/15",
    amber: "bg-amber-500/15",
    indigo: "bg-indigo-500/15",
    rose: "bg-rose-500/15",
    cyan: "bg-cyan-500/15",
    teal: "bg-teal-500/15",
    lime: "bg-lime-500/15",
};

/* ── Helpers ──────────────────────────────────────────────── */
const getFullCalendarDays = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ empty: true });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i });
    while (days.length < 42) days.push({ empty: true });
    return days.map((d, idx) => ({
        ...d,
        date: d.empty ? null : new Date(year, month, d.day),
        idx,
    }));
};

const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

function assignLanes(items) {
    const sorted = [...items].sort((a, b) => {
        const da = a.endCol - a.startCol;
        const db = b.endCol - b.startCol;
        return db !== da ? db - da : a.startCol - b.startCol;
    });
    const lanes = [];
    return sorted.map(item => {
        let lane = 0;
        while (true) {
            if (!lanes[lane]) lanes[lane] = [];
            const overlaps = lanes[lane].some(e => !(e.endCol < item.startCol || e.startCol > item.endCol));
            if (!overlaps) {
                lanes[lane].push(item);
                return { ...item, lane };
            }
            lane++;
        }
    });
}

/* ── Main Component ───────────────────────────────────────── */
const Calendar = ({ projectId }) => {
    const today = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }, []);

    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    });

    const [miniMonth, setMiniMonth] = useState(today.getMonth());
    const [miniYear, setMiniYear] = useState(today.getFullYear());
    const [selectedDay, setSelectedDay] = useState(today);
    const [tasks, setTasks] = useState([]);
    const [rightWidth, setRightWidth] = useState(300);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart.getTime() + i * 86400000);
            d.setHours(0, 0, 0, 0);
            return d;
        }), [weekStart]);

    useEffect(() => {
        const load = async () => {
            if (!projectId) { setTasks([]); return; }
            try {
                const data = await fetchTasks({ projectId });
                setTasks(data.map(t => ({
                    ...t,
                    startDate: t.startDate ? new Date(t.startDate) : null,
                    dueDate: t.dueDate ? new Date(t.dueDate) : null,
                    assignee: t.assignee || { name: "Unassigned", firstName: "", lastName: "" },
                    groupId: t.groupId || { title: "No Group" },
                })));
            } catch (e) {
                console.error("Failed to load tasks:", e);
                setTasks([]);
            }
        };
        load();
    }, [projectId]);

    const getTasksForDay = (day) =>
        tasks.filter(t => {
            if (!t.startDate || !t.dueDate) return false;
            const s = new Date(t.startDate); s.setHours(0, 0, 0, 0);
            const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
            return s <= day && d >= day;
        });

    const stripItems = useMemo(() => {
        const weekStart0 = weekDays[0];
        const weekEnd0 = weekDays[6];
        const raw = tasks.flatMap(task => {
            if (!task.startDate || !task.dueDate) return [];
            const ts = new Date(task.startDate); ts.setHours(0, 0, 0, 0);
            const td = new Date(task.dueDate); td.setHours(0, 0, 0, 0);
            if (td < weekStart0 || ts > weekEnd0) return [];
            let startCol = -1, endCol = -1;
            weekDays.forEach((day, col) => {
                if (ts <= day && td >= day) {
                    if (startCol === -1) startCol = col;
                    endCol = col;
                }
            });
            if (startCol === -1) return [];
            const clippedLeft = ts < weekStart0;
            const clippedRight = td > weekEnd0;
            return [{
                task, startCol, endCol, clippedLeft, clippedRight,
                colorKey: getTaskColor(task.name || task.groupId?.title || "", task._id),
            }];
        });
        return assignLanes(raw);
    }, [tasks, weekDays]);

    const maxLane = stripItems.length > 0 ? Math.max(...stripItems.map(i => i.lane)) + 1 : 0;
    const cellHeight = Math.max(200, STRIP_TOP + maxLane * STRIP_ROW + BOTTOM_PAD);
    const selectedTasks = useMemo(() => getTasksForDay(selectedDay), [tasks, selectedDay]);
    const miniDays = useMemo(() => getFullCalendarDays(miniMonth, miniYear), [miniMonth, miniYear]);

    // Resizable right panel
    const handleMouseDown = (e) => {
        isDragging.current = true;
        startX.current = e.clientX;
        startWidth.current = rightWidth;
        document.body.style.cursor = "col-resize";
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const diff = startX.current - e.clientX;
        const newWidth = Math.max(260, Math.min(420, startWidth.current + diff));
        setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "default";
    };

    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const handleMiniSelect = (date) => {
        if (!date) return;
        setSelectedDay(date);
        const ws = new Date(date);
        ws.setDate(ws.getDate() - ws.getDay());
        setWeekStart(ws);
    };

    const prevWeek = () => setWeekStart(p => {
        const d = new Date(p.getTime() - 7 * 86400000); d.setHours(0, 0, 0, 0); return d;
    });

    const nextWeek = () => setWeekStart(p => {
        const d = new Date(p.getTime() + 7 * 86400000); d.setHours(0, 0, 0, 0); return d;
    });

    const prevMini = () => {
        if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1); }
        else setMiniMonth(m => m - 1);
    };

    const nextMini = () => {
        if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1); }
        else setMiniMonth(m => m + 1);
    };

    return (
        <div className="flex h-full bg-white overflow-hidden sf-regular tracking-tight">
            {/* LEFT — Weekly View */}
            <div className="flex-1 flex flex-col min-w-0 sf-regular">
                {/* Week Navigation */}
                <div className="flex items-center px-4 sf-regular justify-between p-2 pt-0 bg-white">
                    <button onClick={prevWeek} className="p-1 hover:bg-neutral-200 rounded-lg transition">
                        <FiChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-black">
                        <span>
                            {months[weekStart.getMonth()]} {weekStart.getFullYear()}
                        </span>
                    </div>
                    <button onClick={nextWeek} className="p-1 hover:bg-neutral-200 rounded-lg transition">
                        <FiChevronRight size={20} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto sf-regular bg-white custom-scroll">
                    <div className="relative">
                        {/* Background Cells */}
                        <div className="grid grid-cols-7">
                            {weekDays.map((day, idx) => {
                                const isSelected = isSameDay(day, selectedDay);
                                const isToday = isSameDay(day, today);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDay(day)}
                                        className={`min-h-[360px] border border-neutral-200 p-2 cursor-pointer transition hover:bg-neutral-50 ${isSelected ? 'bg-neutral-100' : ''}`}
                                        style={{ height: cellHeight }}
                                    >
                                        <div className="flex justify-end">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                                                ${isToday ? 'bg-black text-white' : isSelected ? 'bg-black text-white' : 'text-black'}`}>
                                                {day.getDate()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Strip Overlay */}
                        <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
                            {stripItems.map(({ task, startCol, endCol, lane, colorKey, clippedLeft, clippedRight }) => {
                                const bg = COLOR_BG[colorKey] || COLOR_BG.indigo;
                                const border = COLOR_BORDER[colorKey] || COLOR_BORDER.indigo;
                                const color = COLOR_TEXT[colorKey] || COLOR_TEXT.indigo;
                                const spanCols = endCol - startCol + 1;
                                const topPx = STRIP_TOP + lane * STRIP_ROW;

                                return (
                                    <div
                                        key={task._id}
                                        title={task.name || task.groupId?.title}
                                        className="pointer-events-auto absolute flex items-center gap-2 px-3 overflow-hidden text-xs"
                                        style={{
                                            top: topPx,
                                            left: `calc(${startCol} / 7 * 100% + ${SIDE_PAD}px)`,
                                            width: `calc(${spanCols} / 7 * 100% - ${SIDE_PAD * 2}px)`,
                                            height: STRIP_H,
                                            background: bg,
                                            borderLeft: `3px solid ${border}`,
                                            borderRadius: 0,
                                            color: color,
                                        }}
                                    >
                                        <span className="truncate">{task.name || task.groupId?.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Resizable Divider */}
            <div
                className="w-0.5 bg-transparent cursor-col-resize transition-colors"
                onMouseDown={handleMouseDown}
            />

            {/* RIGHT PANEL */}
            <div
                className="flex flex-col border-l border-neutral-200 bg-white custom-scroll"
                style={{ width: rightWidth }}
            >
                {/* Mini Calendar */}
                <div className="p-3 border-b border-neutral-200">
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={prevMini} className="p-1.5 hover:bg-neutral-200 rounded-lg">
                            <FiChevronLeft size={15} />
                        </button>
                        <span className="text-sm text-black">
                            {months[miniMonth]} {miniYear}
                        </span>
                        <button onClick={nextMini} className="p-1.5 hover:bg-neutral-200 rounded-lg">
                            <FiChevronRight size={15} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs">
                        {weekdays.map(d => <div key={d} className="text-neutral-500 py-1">{d[0]}</div>)}
                        {miniDays.map((d, i) => {
                            const isTod = d.date && isSameDay(d.date, today);
                            const isSel = d.date && isSameDay(d.date, selectedDay);
                            return (
                                <div
                                    key={i}
                                    onClick={() => handleMiniSelect(d.date)}
                                    className={`h-7 w-7 flex items-center justify-center text-xs cursor-pointer transition rounded
                                        ${isSel ? 'bg-neutral-200 text-black' : isTod ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}
                                >
                                    {d.day}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Day Tasks */}
                <div className="flex-1 overflow-auto p-4 custom-scroll-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-black">
                            {isSameDay(selectedDay, today) ? "Today's Tasks" : selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs bg-neutral-200 px-1.5 py-1 rounded-full text-black">
                            {selectedTasks.length}
                        </span>
                    </div>

                    {selectedTasks.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400 text-sm">
                            No tasks scheduled
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedTasks.map(task => {
                                const ck = getTaskColor(task.name || task.groupId?.title || "", task._id);
                                const bg = COLOR_BG[ck] || COLOR_BG.indigo;
                                const border = COLOR_BORDER[ck] || COLOR_BORDER.indigo;
                                const color = COLOR_TEXT[ck] || COLOR_TEXT.indigo;
                                const pillBg = COLOR_PILL_BG[ck] || "bg-neutral-200";

                                const assigneeName = task.assignee?.firstName
                                    ? `${task.assignee.firstName} ${task.assignee.lastName || ""}`.trim()
                                    : "Unassigned";

                                return (
                                    <div
                                        key={task._id}
                                        className="rounded-md p-3 text-sm leading-tight pointer-events-auto"
                                        style={{
                                            background: bg,
                                            borderLeft: `4px solid ${border}`,
                                            color: color,
                                        }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span
                                                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: COLOR_DOT[ck] || COLOR_DOT.indigo }}
                                            />
                                            <div className="flex-1 line-clamp-2 text-sm ms-1 truncate">
                                                {task.name || task.groupId?.title}
                                            </div>
                                        </div>

                                        <div className="pl-5 mt-3 text-xs flex items-center gap-3">
                                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${pillBg}`}>
                                                <FiUser size={12} /> {assigneeName}
                                            </span>

                                            {task.dueDate && (
                                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${pillBg}`}>
                                                    <FiClock size={12} />
                                                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calendar;