import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const daysOfWeekShort = ["S", "M", "T", "W", "T", "F", "S"];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const Timeline = () => {
  const today = new Date(2025, 9, 18); // Oct 18, 2025

  const [selectedScale, setSelectedScale] = useState("12M");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);

  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

  const assignees = ["John", "Jane", "Alice"];
  const priorities = ["High", "Medium", "Low"];
  const scales = ["1D", "30D", "12M"];

  // Generate Bars
  let bars = [];

  if (selectedScale === "1D") {
    bars = [today];
  } else if (selectedScale === "30D") {
    const endDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    for (let day = 1; day <= endDay; day += 3) {
      bars.push(new Date(today.getFullYear(), today.getMonth(), day));
    }
  } else if (selectedScale === "12M") {
    for (let i = 0; i < 12; i++) {
      bars.push(new Date(today.getFullYear(), i, 1));
    }
  }

  // Find closest bar
  let closestBar = bars[0];
  let minDiff = Infinity;

  if (selectedScale === "30D") {
    bars.forEach((b) => {
      const diff = Math.abs(b.getDate() - today.getDate());

      if (diff < minDiff) {
        minDiff = diff;
        closestBar = b;
      }
    });
  }

  // Random Tasks
  const taskNames = ["Design", "API", "Review", "Test", "Deploy"];
  const colors = ["indigo", "yellow", "green"];

  const taskData = React.useMemo(() => {
    const data = {};
    bars.forEach((bar) => {
      if (Math.random() > 0.6) {
        const numTasks = Math.floor(Math.random() * 2) + 1;
        data[bar.toDateString()] = [];
        for (let i = 0; i < numTasks; i++) {
          data[bar.toDateString()].push({
            name: taskNames[Math.floor(Math.random() * taskNames.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
      }
    });
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScale]);

  const colorClasses = {
    indigo: "bg-indigo-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
  };

  const getBarWidth = () => {
    if (selectedScale === "1D") return "80px";
    if (selectedScale === "30D") return "80px";
    if (selectedScale === "12M") return "calc(100% / 12 - 8px)";
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {/* Assignee */}
        <div className="relative">
          <button
            onClick={() => {
              setAssigneeOpen(!assigneeOpen);
              setPriorityOpen(false);
              setScaleOpen(false);
            }}
            className="flex items-center justify-between min-w-[120px] px-2 py-1 border border-neutral-300 rounded bg-white"
          >
            {selectedAssignee || "Select Assignee"}
            <FiChevronDown className="ml-2" />
          </button>

          {assigneeOpen && (
            <div className="absolute bg-white border mt-1 rounded shadow">
              {assignees.map((a) => (
                <div
                  key={a}
                  onClick={() => {
                    setSelectedAssignee(a);
                    setAssigneeOpen(false);
                  }}
                  className="px-3 py-1 cursor-pointer hover:bg-neutral-200"
                >
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => {
              setPriorityOpen(!priorityOpen);
              setAssigneeOpen(false);
              setScaleOpen(false);
            }}
            className="flex items-center justify-between min-w-[120px] px-2 py-1 border border-neutral-300 rounded bg-white"
          >
            {selectedPriority || "Select Priority"}
            <FiChevronDown className="ml-2" />
          </button>

          {priorityOpen && (
            <div className="absolute bg-white border mt-1 rounded shadow">
              {priorities.map((p) => (
                <div
                  key={p}
                  onClick={() => {
                    setSelectedPriority(p);
                    setPriorityOpen(false);
                  }}
                  className="px-3 py-1 cursor-pointer hover:bg-neutral-200"
                >
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scale */}
        <div className="relative">
          <button
            onClick={() => {
              setScaleOpen(!scaleOpen);
              setAssigneeOpen(false);
              setPriorityOpen(false);
            }}
            className="flex items-center justify-between min-w-[80px] px-2 py-1 border border-neutral-300 rounded bg-white"
          >
            {selectedScale}
            <FiChevronDown className="ml-2" />
          </button>

          {scaleOpen && (
            <div className="absolute bg-white border mt-1 rounded shadow">
              {scales.map((s) => (
                <div
                  key={s}
                  onClick={() => {
                    setSelectedScale(s);
                    setScaleOpen(false);
                  }}
                  className="px-3 py-1 cursor-pointer hover:bg-neutral-200"
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex gap-2 overflow-x-auto">
        {bars.map((bar, idx) => {
          const key = bar.toDateString();
          const tasks = taskData[key] || [];

          let isCurrent = false;

          if (selectedScale === "1D") {
            isCurrent = bar.toDateString() === today.toDateString();
          } else if (selectedScale === "30D") {
            isCurrent = bar.toDateString() === closestBar.toDateString();
          } else if (selectedScale === "12M") {
            isCurrent = bar.getMonth() === today.getMonth();
          }

          return (
            <div
              key={idx}
              className="flex flex-col items-center"
              style={{
                width: getBarWidth(),
              }}
            >
              {/* Date Label */}
              <div className="text-xs mb-2">
                {selectedScale === "12M"
                  ? months[bar.getMonth()]
                  : `${bar.getDate()} ${daysOfWeekShort[bar.getDay()]}`}
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-1 mb-2">
                {tasks.map((t, i) => (
                  <div
                    key={i}
                    className={`px-2 py-1 text-xs text-white rounded ${
                      colorClasses[t.color]
                    }`}
                  >
                    {t.name}
                  </div>
                ))}
              </div>

              {/* Bar */}
              <div
                className={`w-full h-2 rounded ${
                  isCurrent ? "bg-blue-500" : "bg-neutral-300"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
