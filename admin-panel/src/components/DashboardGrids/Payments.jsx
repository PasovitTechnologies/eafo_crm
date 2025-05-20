import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import "./Payments.css";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6B7280"]; // green, amber, red, gray

const Payments = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [chartData, setChartData] = useState([]);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${baseUrl}/api/courses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        const courseList = Array.isArray(data) ? data : data.courses || [];
        setCourses(courseList);
        if (courseList.length > 0) {
          setSelectedCourseId(courseList[0]._id);
        }
      })
      .catch((err) => console.error("Error fetching courses:", err));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;

    const selectedCourse = courses.find((c) => c._id === selectedCourseId);
    if (!selectedCourse || !selectedCourse.payments) return;

    const payments = selectedCourse.payments;

    const summary = {
      Paid: 0,
      Pending: 0,
      Expired: 0,
      "Not Created": 0
    };

    payments.forEach((p) => {
      const status = p.status?.toLowerCase();
      const amount = parseFloat(p.payableAmount || p.amount || 0);

      if (status === "paid") {
        summary.Paid += amount;
      } else if (status === "pending") {
        summary.Pending += amount;
      } else if (status === "not created") {
        summary["Not Created"] += amount;
      } else {
        summary.Expired += amount;
      }
    });

    const formatted = [
      { name: "Paid", value: summary.Paid },
      { name: "Pending", value: summary.Pending },
      { name: "Expired", value: summary.Expired },
      { name: "Not Created", value: summary["Not Created"] }
    ];

    setChartData(formatted);
  }, [selectedCourseId, courses]);

  return (
    <div className="payments-wrapper">
      <div className="payments-card">
        <div className="payments-header">
          <div className="select-wrapper">
            <label htmlFor="course-select">Select Course:</label>
            <select
              id="course-select"
              value={selectedCourseId || ""}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toLocaleString()} ₽`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Payments;
