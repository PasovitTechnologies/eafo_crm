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
import "./Courses.css";
import { useTranslation } from "react-i18next";  

const baseUrl = import.meta.env.VITE_BASE_URL;

const Courses = () => {
  const { t } = useTranslation();
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState("all");
  const [filteredData, setFilteredData] = useState([]);
  const [range, setRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch Forms and Courses
  useEffect(() => {
    const fetchForms = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No token found");
        setError("No authorization token found.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/form`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch forms.");
        }

        const data = await response.json();
        if (data.forms && Array.isArray(data.forms)) {
          const registrationForms = data.forms.filter(
            (form) => form.isUsedForRegistration
          );

          // ✅ Fetch course names for each form
          const formsWithCourses = await Promise.all(
            registrationForms.map(async (form) => {
              if (form.courseId) {
                try {
                  const courseResponse = await fetch(
                    `${baseUrl}/api/courses/${form.courseId}`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                    }
                  );

                  if (courseResponse.ok) {
                    const courseData = await courseResponse.json();
                    form.courseName = courseData.name; // Add course name
                  } else {
                    form.courseName = "Unknown Course";
                  }
                } catch (error) {
                  console.error("Failed to fetch course:", error);
                  form.courseName = "Unknown Course";
                }
              } else {
                form.courseName = "No Course Linked";
              }
              return form;
            })
          );

          setForms(formsWithCourses);
        } else {
          console.error("Unexpected response format:", data);
          setError("Unexpected response format.");
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching forms:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  // ✅ Fetch submissions for all or specific forms
  useEffect(() => {
    const fetchAllSubmissions = async () => {
      const token = localStorage.getItem("token");

      try {
        const allSubmissions = [];

        // Fetch submissions for all forms
        await Promise.all(
          forms.map(async (form) => {
            try {
              const response = await fetch(`${baseUrl}/api/form/${form._id}`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                const formData = await response.json();
                if (formData && Array.isArray(formData.submissions)) {
                  allSubmissions.push(...formData.submissions);
                }
              }
            } catch (error) {
              console.error(
                `Error fetching submissions for form ${form._id}:`,
                error
              );
            }
          })
        );

        const chartData = filterSubmissionsByRange(allSubmissions, range);
        setFilteredData(chartData);
      } catch (error) {
        console.error("Error fetching all submissions:", error);
        setFilteredData([]);
      }
    };

    const fetchSingleFormSubmissions = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(`${baseUrl}/api/form/${selectedForm}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch submissions.");
        }

        const formData = await response.json();

        if (formData && Array.isArray(formData.submissions)) {
          const chartData = filterSubmissionsByRange(
            formData.submissions,
            range
          );
          setFilteredData(chartData);
        } else {
          console.error("Unexpected response format:", formData);
          setFilteredData([]);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
        setFilteredData([]);
      }
    };

    if (selectedForm === "all") {
      fetchAllSubmissions();
    } else {
      fetchSingleFormSubmissions();
    }
  }, [selectedForm, range, forms]);

  // ✅ Handle form selection
  const handleFormChange = (e) => {
    setSelectedForm(e.target.value);
  };

  // ✅ Handle range filter change
  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  // ✅ Filter submissions by date range
  const filterSubmissionsByRange = (submissions, range) => {
    if (!Array.isArray(submissions)) return [];

    const timestamps = submissions.map((s) => new Date(s.createdAt));
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
      weekEnd.setDate(weekEnd.getDate() - i * 7); // Move backward by 'i' weeks
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6); // Start of the week

      // ✅ Correct template string syntax with backticks
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

    // ✅ Group submissions into weeks
    timestamps.forEach((ts) => {
      const entryDate = new Date(ts);
      weekRanges.forEach((week) => {
        if (entryDate >= week.start && entryDate <= week.end) {
          week.count += 1;
        }
      });
    });

    // ✅ Return the weeks in chronological order
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

  if (loading) return <div className="loading">{t("Courses.loading")}</div>;
  if (error) return <div className="error">{t("Courses.error")} {error}</div>;

  return (
    <div className="content-card-wrapper">
      <div className="content-card highlight-box">
        <div className="box-content">
          <h3>{t("Courses.totalSubmissions")}</h3>
          <p className="user-count">
            {filteredData.reduce((acc, item) => acc + item.count, 0)}
          </p>
        </div>
      </div>
      <div className="content-card chart-card">
        <div className="chart-header">
          <select
            className="form-dropdown"
            value={selectedForm}
            onChange={handleFormChange}
          >
            <option value="all">{t("Courses.allForms")}</option>
            {forms.map((form) => (
              <option key={form._id} value={form._id}>
                {form.courseName} - {form.formName}
              </option>
            ))}
          </select>

          <div className="filter-buttons">
            {["week", "month", "3months", "6months", "all"].map((option) => (
              <button
                key={option}
                className={range === option ? "active" : ""}
                onClick={() => handleRangeChange(option)}
              >
                {t(`Courses.${option}`)}
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

export default Courses;
