import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useSpring, animated } from "@react-spring/web";
import "./Users.css";
import { useTranslation } from "react-i18next";

const baseUrl = import.meta.env.VITE_BASE_URL;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [percentageChange, setPercentageChange] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [range, setRange] = useState("all");
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        setUsers(data);

        const currentPeriod = filterData(data, range);
        setFilteredData(currentPeriod);

        // ✅ Update user count based on the filtered data
        const totalUsers = currentPeriod.reduce(
          (acc, item) => acc + item.users,
          0
        );
        setUserCount(totalUsers);

        // ✅ Update percentage change for latest 2 weeks
        if (range === "month") {
          calculatePercentageChangeForWeeks(currentPeriod);
        } else {
          calculateLastTwoSetsPercentageChange(currentPeriod);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchData();
  }, [range]);

  // ✅ Calculate percentage change between the last two periods of filtered data
  const calculateLastTwoSetsPercentageChange = (data) => {
    if (data.length < 2) {
      setPercentageChange(0);
      return;
    }

    const lastSet = data[data.length - 1].users;
    const previousSet = data[data.length - 2].users;

    if (previousSet === 0 && lastSet === 0) {
      setPercentageChange(0);
    } else if (previousSet === 0) {
      setPercentageChange(100);
    } else {
      const change = ((lastSet - previousSet) / previousSet) * 100;
      setPercentageChange(change);
    }
  };

  // ✅ Calculate percentage change between the last 2 weeks
  const calculatePercentageChangeForWeeks = (data) => {
    if (data.length < 2) {
      setPercentageChange(0);
      return;
    }

    const lastWeek = data[data.length - 1].users;
    const previousWeek = data[data.length - 2].users;

    if (previousWeek === 0 && lastWeek === 0) {
      setPercentageChange(0);
    } else if (previousWeek === 0) {
      setPercentageChange(100);
    } else {
      const change = ((lastWeek - previousWeek) / previousWeek) * 100;
      setPercentageChange(change);
    }
  };

  // 🌟 Group data by days for the last 7 days
  const groupByDay = (data, days) => {
    const result = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        users: 0,
      };
    }).reverse();

    data.forEach((entry) => {
      const entryDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const dayIndex = result.findIndex((item) => item.label === entryDate);
      if (dayIndex !== -1) {
        result[dayIndex].users += 1;
      }
    });

    return result;
  };

  // 🌟 Group data by rolling weeks for the last month
  const groupByRollingWeeksForMonth = (data) => {
    const now = new Date();
    const weekRanges = [];

    // Generate weekly ranges for the last 4 weeks
    for (let i = 0; i < 4; i++) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i + 1) * 7 + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      weekRanges.unshift({
        label: `${start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
        users: 0,
      });
    }

    data.forEach((entry) => {
      const entryDate = new Date(entry.createdAt);
      weekRanges.forEach((week) => {
        const [startLabel, endLabel] = week.label.split(" - ");
        const startDate = new Date(startLabel);
        const endDate = new Date(endLabel);

        if (entryDate >= startDate && entryDate <= endDate) {
          week.users += 1;
        }
      });
    });

    return weekRanges;
  };


  const groupByRollingWeeks = (data) => {
    const now = new Date();
    const weekRanges = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7 + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

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
        users: 0,
      });
    }

    data.forEach((entry) => {
      const entryDate = new Date(entry.createdAt);
      weekRanges.forEach((week) => {
        if (entryDate >= week.start && entryDate <= week.end) {
          week.users += 1;
        }
      });
    });

    return weekRanges.reverse();
  };

  // 🌟 Group data by months
  const groupByMonths = (data, months) => {
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      result.push({ label: monthLabel, users: 0 });
    }

    data.forEach((entry) => {
      const entryDate = new Date(entry.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      const monthIndex = result.findIndex((item) => item.label === entryDate);
      if (monthIndex !== -1) {
        result[monthIndex].users += 1;
      }
    });

    return result;
  };

  // 🌟 Filter data based on the selected range
  const filterData = (data, range) => {
    switch (range) {
      case "week":
        return groupByDay(data, 7);
      case "month":
        return groupByRollingWeeks(data);
      case "3months":
        return groupByMonths(data, 3);
      case "6months":
        return groupByMonths(data, 6);
      case "all":
        return groupByMonths(data, 12);
      default:
        return data;
    }
  };

  const countSpring = useSpring({
    from: { number: 0 },
    to: { number: userCount },
    config: { duration: 1000 },
  });

  const percentageSpring = useSpring({
    from: { number: 0 },
    to: { number: percentageChange },
    config: { duration: 1000 },
  });

  return (
    <div className="content-card-wrapper">
      <div className="content-card highlight-box">
        <div className="box-content">
          <h3>{t("Users.total")}</h3>
          <animated.p className="user-count">
            {countSpring.number.to((n) => Math.floor(n))}
          </animated.p>
          <animated.span
            className={`percentage ${
              percentageChange >= 0 ? "increase" : "decrease"
            }`}
          >
            {percentageSpring.number.to(
              (n) => `${n >= 0 ? "▲" : "▼"} ${Math.abs(n).toFixed(2)}%`
            )}
          </animated.span>
        </div>
      </div>

      <div className="content-card chart-card">
        <div className="chart-header">
          <h3>{t("Users.chart")}</h3>
          <div className="filter-buttons">
            {["week", "month", "3months", "6months", "all"].map((option) => (
              <button
                key={option}
                className={range === option ? "active" : ""}
                onClick={() => setRange(option)}
              >
                {t(`Users.${option}`)}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#2575fc"
              fill="#a1c4fd"
              fillOpacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Users;
