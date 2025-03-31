import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useSpring, animated } from "@react-spring/web"; // 🎯 Animation import
import "./Users.css";
import { useTranslation } from "react-i18next";  


const baseUrl = import.meta.env.VITE_BASE_URL;

const Webinars = () => {
    const { t } = useTranslation();
  const [webinars, setWebinars] = useState([]);
  const [selectedWebinar, setSelectedWebinar] = useState("all");
  const [filteredData, setFilteredData] = useState([]);
  const [range, setRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch Webinars
  useEffect(() => {
    const fetchWebinars = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authorization token found.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/webinars`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch webinars.");
        }

        const data = await response.json();
        setWebinars(data);

        // Display combined participant data initially
        const allParticipants = data.flatMap((webinar) => webinar.participants);
        const chartData = filterWebinarData(allParticipants, range);
        setFilteredData(chartData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching webinars:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  // ✅ Animation hook called **unconditionally**
  const chartAnimation = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0)" },
    reset: true,
    config: { duration: 500 },
  });

  // ✅ Filter participants by time range
  const filterWebinarData = (participants, range) => {
    const timestamps = participants.map((p) => new Date(p.registeredAt));
    let result = [];

    if (range === "week") {
      result = groupByDays(timestamps, 7);
    } else if (range === "month") {
      result = groupByWeeks(timestamps, 4);
    } else if (range === "3months") {
      result = groupByMonths(timestamps, 3);
    } else if (range === "6months") {
      result = groupByMonths(timestamps, 6);
    } else {
      result = groupByMonths(timestamps, 12);
    }

    return result;
  };

  // ✅ Group by days
  const groupByDays = (timestamps, days) => {
    const result = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        count: 0,
      };
    }).reverse();

    timestamps.forEach((ts) => {
      const dateLabel = ts.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const index = result.findIndex((item) => item.label === dateLabel);
      if (index !== -1) {
        result[index].count += 1;
      }
    });

    return result;
  };

  // ✅ Group by weeks
  const groupByWeeks = (timestamps, weeks = 4) => {
    const now = new Date();
    const weekRanges = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      weekRanges.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${weekEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        count: 0,
      });
    }

    timestamps.forEach((ts) => {
      const entryDate = new Date(ts);
      weekRanges.forEach((week) => {
        if (entryDate >= week.start && entryDate <= week.end) {
          week.count += 1;
        }
      });
    });

    return weekRanges.reverse();
  };

  // ✅ Group by months
  const groupByMonths = (timestamps, months) => {
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      result.push({ label: monthLabel, count: 0 });
    }

    timestamps.forEach((ts) => {
      const dateLabel = ts.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const index = result.findIndex((item) => item.label === dateLabel);
      if (index !== -1) {
        result[index].count += 1;
      }
    });

    return result;
  };

  useEffect(() => {
    if (!webinars.length) return;

    if (selectedWebinar === "all") {
      const allParticipants = webinars.flatMap(
        (webinar) => webinar.participants
      );
      const chartData = filterWebinarData(allParticipants, range);
      setFilteredData(chartData);
    } else {
      const webinar = webinars.find((w) => w._id === selectedWebinar);
      if (webinar) {
        const chartData = filterWebinarData(webinar.participants, range);
        setFilteredData(chartData);
      }
    }
  }, [selectedWebinar, webinars, range]);

  if (loading) return <div>{t("webinars.loading")}</div>;
  if (error) return <div>{t("webinars.error", { error })}</div>;

  return (
    <div className="content-card-wrapper">
      <div className="content-card highlight-box">
        <div className="box-content">
          <h3>{t("webinars.totalParticipants")}</h3>
          <p className="user-count">
            {filteredData.reduce((acc, item) => acc + item.count, 0)}
          </p>
        </div>
      </div>

      <div className="content-card chart-card">
        <div className="chart-header">
          <select
            value={selectedWebinar}
            onChange={(e) => setSelectedWebinar(e.target.value)}
          >
            <option value="all">{t("webinars.allWebinars")}</option>
            {webinars.map((webinar) => (
              <option key={webinar._id} value={webinar._id}>
                {webinar.title}
              </option>
            ))}
          </select>

          <div className="filter-buttons">
            {["week", "month", "3months", "6months", "all"].map((option) => (
              <button
                key={option}
                className={range === option ? "active" : ""}
                onClick={() => setRange(option)}
              >
               {t(`webinars.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {/* 🎯 Animated Chart */}

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2575fc"
              fill="#a1c4fd"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Webinars;
