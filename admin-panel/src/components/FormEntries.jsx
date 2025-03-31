import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import "./FormEntries.css";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiDownload,
  FiX,
} from "react-icons/fi";
import SubmissionModal from "./SubmissionModal";
import FormInfoModal from "./FormInfoModal";
import { useTranslation } from "react-i18next";  


const FormEntries = () => {
  const { formId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showManualExport, setShowManualExport] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("All Entries");
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [currentRecords, setCurrentRecords] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  
  const tableRef = useRef(null);
  const filterRef = useRef(null);
  const exportRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const filterOptions = [
    "All Entries",
    "Today Entries",
    "Yesterday Entries",
    "Last 7 days",
    "Last 30 days",
  ];

  useEffect(() => {
    if (!formId) {
      setError("Form ID is missing from the URL.");
      setLoading(false);
      return;
    }
  
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token"); // Retrieve the token
  
        const [questionsRes, submissionsRes] = await Promise.all([
          fetch(`${baseUrl}/api/form/${formId}/questions`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }),
          fetch(`${baseUrl}/api/form/${formId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          })
        ]);
  
        if (!questionsRes.ok || !submissionsRes.ok) throw new Error("Failed to fetch data.");
  
        const questionsData = await questionsRes.json();
        const submissionsData = await submissionsRes.json();
  
        setQuestions(questionsData || []);
        setSubmissions(submissionsData.submissions || []);
        setFilteredSubmissions(submissionsData.submissions || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [formId]);
  
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
  
    const setInitialWidths = () => {
      table.querySelectorAll("th.question-header").forEach((th) => {
        const questionLabel = th.querySelector(".question-label");
        if (questionLabel) {
          const computedWidth = Math.ceil(questionLabel.scrollWidth) + 20; // Add padding
          th.style.width = `${computedWidth}px`;
          th.setAttribute("data-min-width", "80"); // Allow shrinking below text width
        }
      });
    };
  
    setInitialWidths();
  
    let startX, startWidth, currentTh, minWidth;
  
    const handleMouseDown = (event) => {
      currentTh = event.target.parentElement;
      startX = event.clientX;
      startWidth = currentTh.offsetWidth;
      minWidth = parseFloat(currentTh.getAttribute("data-min-width")) || 80; // Min width of 80px
  
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
  
    const handleMouseMove = (event) => {
      if (!currentTh) return;
      const newWidth = Math.max(minWidth, startWidth + (event.clientX - startX));
  
      const columnIndex = [...currentTh.parentElement.children].indexOf(currentTh);
      table.querySelectorAll(`tr td:nth-child(${columnIndex + 1})`).forEach((td) => {
        td.style.width = `${newWidth}px`;
      });
      currentTh.style.width = `${newWidth}px`;
  
      // ✅ Handle truncation dynamically
      const questionLabel = currentTh.querySelector(".question-label");
      if (questionLabel) {
        if (newWidth < parseFloat(currentTh.getAttribute("data-min-width"))) {
          questionLabel.classList.add("truncate");
        } else {
          questionLabel.classList.remove("truncate");
        }
      }
    };
  
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  
    table.querySelectorAll("th .resizer").forEach((resizer) => {
      resizer.addEventListener("mousedown", handleMouseDown);
    });
  
    return () => {
      table.querySelectorAll("th .resizer").forEach((resizer) => {
        resizer.removeEventListener("mousedown", handleMouseDown);
      });
    };
  }, [questions]);
  

  // Pagination logic

  const handleQuestionSelection = (event, questionId) => {
    if (event.target.checked) {
      setSelectedQuestions((prev) => [...prev, questionId]); // Add to array
    } else {
      setSelectedQuestions((prev) => prev.filter((id) => id !== questionId)); // Remove from array
    }
  };

  const totalRecords = filteredSubmissions.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
  const paginatedRecords = filteredSubmissions.slice(startIndex, endIndex);

  // Filtering logic
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setCurrentPage(1); // Reset pagination
    setShowFilterDropdown(false);

    const today = new Date();
    let filteredData = submissions;

    if (filter === "Today Entries") {
      filteredData = submissions.filter(
        (s) => new Date(s.submittedAt).toDateString() === today.toDateString()
      );
    } else if (filter === "Yesterday Entries") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      filteredData = submissions.filter(
        (s) =>
          new Date(s.submittedAt).toDateString() === yesterday.toDateString()
      );
    } else if (filter === "Last 7 days") {
      const last7Days = new Date();
      last7Days.setDate(today.getDate() - 7);
      filteredData = submissions.filter(
        (s) => new Date(s.submittedAt) >= last7Days
      );
    } else if (filter === "Last 30 days") {
      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      filteredData = submissions.filter(
        (s) => new Date(s.submittedAt) >= last30Days
      );
    }

    setFilteredSubmissions(filteredData);
  };

  const handleExport = (type) => {
    if (!submissions.length) {
      alert("No data available to export.");
      return;
    }

    let exportData = [];

    if (type === "all") {
      exportData = submissions.map((submission) => {
        const row = {
          "Submission ID": submission._id,
          "Submitted At": new Date(submission.submittedAt).toLocaleString(),
        };
        questions.forEach((q) => {
          row[q.label] =
            submission.responses.find((r) => r.questionId === q._id)?.answer ||
            "";
        });
        return row;
      });
    } else {
      if (!selectedQuestions.length) {
        alert("Please select at least one question to export.");
        return;
      }

      exportData = submissions.map((submission) => {
        const row = {
          "Submission ID": submission._id,
          "Submitted At": new Date(submission.submittedAt).toLocaleString(),
        };
        selectedQuestions.forEach((qId) => {
          const question = questions.find((q) => q._id === qId);
          if (question) {
            row[question.label] =
              submission.responses.find((r) => r.questionId === qId)?.answer ||
              "";
          }
        });
        return row;
      });
    }

    // Convert to CSV format
    const csvContent = [
      Object.keys(exportData[0]).join(","), // Header row
      ...exportData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ), // Data rows
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "submissions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualExport = () => {
    if (selectedQuestions.length === 0) {
      alert("Please select at least one question to export.");
      return;
    }

    const exportData = submissions.map((submission) => {
      let row = {
        "Submission ID": submission._id,
        "Submitted At": new Date(submission.submittedAt).toLocaleString(),
      };

      selectedQuestions.forEach((qId) => {
        const question = questions.find((q) => q._id === qId);
        row[question?.label] =
          submission.responses.find((r) => r.questionId === qId)?.answer || "";
      });

      return row;
    });

    const csvContent = [
      Object.keys(exportData[0]).join(","),
      ...exportData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "filtered_submissions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset selection after export
    setSelectedQuestions([]);
    setShowManualExport(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target) &&
        exportRef.current &&
        !exportRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false);
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return <p>Loading submissions...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="form-entries-page">
      <div className="table-container">
        <h2>{t("FormEntries.form_submissions")}</h2>

        <div className="top-bar">
          {/* Filter Dropdown */}
          <div className="filter-container" ref={filterRef}>
            <button
              className="filter-button"
              onClick={() => setShowFilterDropdown((prev) => !prev)}
            >
              {selectedFilter} <FiChevronDown />
            </button>
            {showFilterDropdown && (
              <div className="filter-dropdown">
                {filterOptions.map((filter) => (
                  <p
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={selectedFilter === filter ? "active-filter" : ""}
                  >
                    {filter}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="export-container" ref={exportRef}>
            <button
              className="export-button"
              onClick={() => setShowExportDropdown((prev) => !prev)}
            >
              <FiDownload />  {t("FormEntries.export")}
            </button>

            {showExportDropdown && (
              <div className="export-dropdown">
                <p onClick={() => handleExport("all")}>{t("FormEntries.export_all_csv")}</p>
                <p onClick={() => setShowManualExport(true)}>
                {t("FormEntries.manual_export")}
                </p>
              </div>
            )}
          </div>
        </div>

        {showManualExport && (
          <div
            className="manual-export-overlay"
            onClick={() => setShowManualExport(false)}
          >
            <div
              className="manual-export-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Icon in the Top Right Corner */}
              <button
                className="close-icon"
                onClick={() => setShowManualExport(false)}
              >
                <FiX />
              </button>

              <h3>Manual Export</h3>

              <div className="manual-export-modal-content">
                <div className="question-selection">
                  {questions.map((q) => (
                    <label key={q._id} className="question-item">
                      <input
                        type="checkbox"
                        value={q._id}
                        onChange={(e) => handleQuestionSelection(e, q._id)}
                        checked={selectedQuestions.includes(q._id)}
                      />
                      <span dangerouslySetInnerHTML={{ __html: q.label }} />
                    </label>
                  ))}
                </div>

                <button className="export-btn" onClick={handleManualExport}>
                {t("FormEntries.export_selected_csv")}
                </button>
              </div>
            </div>
          </div>
        )}

<div className="table-scroll">
  <table ref={tableRef}>
    <thead>
      <tr>
        <th>
          # <div className="resizer" />
        </th>
        <th>
        {t("FormEntries.submission_id")} <div className="resizer" />
        </th>
        <th>
        {t("FormEntries.submitted_at")} <div className="resizer" />
        </th>
        {questions.map((question) => (
          <th key={question._id} className="question-header">
            <div
              className="question-label"
              title={question.label}
              dangerouslySetInnerHTML={{ __html: question.label }}
            />
            <div className="resizer" />
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {paginatedRecords.length === 0 ? (
        <tr>
          <td colSpan={3 + questions.length} className="empty-data">
          {t("FormEntries.no_records")}
          </td>
        </tr>
      ) : (
        paginatedRecords.map((submission, index) => {
          const { _id, submittedAt, responses } = submission;
          const isSelected = selectedSubmission?._id === _id; // Check if row is selected

          return (
            <tr
              key={_id}
              onClick={() => setSelectedSubmission(submission)}
              className={isSelected ? "selected-row" : ""}
              style={{ cursor: "pointer" }} // UX improvement
            >
              <td>{startIndex + index + 1}</td>
              <td>{_id}</td>
              <td>{new Date(submittedAt).toLocaleString()}</td>
              {questions.map(({ _id: questionId }) => {
                const response = responses.find(
                  (r) => r.questionId === questionId
                );
                const answer = response
                  ? typeof response.answer === "boolean"
                    ? response.answer.toString()
                    : response.answer
                  : "";
                return (
                  <td key={questionId} className="answer-cell">
                    {answer}
                  </td>
                );
              })}
            </tr>
          );
        })
      )}
    </tbody>
  </table>
</div>

{/* ✅ Conditional Submission Modal */}
{selectedSubmission && (
  <SubmissionModal
    submission={selectedSubmission}
    questions={questions}
    onClose={() => setSelectedSubmission(null)}
  />
)}



        

        <div className="pagination-controls">
          <div className="records-per-page">
            <select
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 20, 50].map((num) => (
                <option key={num} value={num}>
                  {num} {t("FormEntries.records")}
                </option>
              ))}
            </select>
          </div>

          <div className="pagination-info">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              <FiChevronLeft />
            </button>
            <span>
              {totalRecords > 0
                ? `${Math.min(startIndex + 1, totalRecords)} to ${Math.min(
                    endIndex,
                    totalRecords
                  )} of ${totalRecords}`
                : "No records available"}
            </span>
            <button
              disabled={currentPage === totalPages || totalRecords === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEntries;
