import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaFileExport, FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";  // Import useNavigate
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import "./UserDatabase.css";

const UserDatabase = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();  // Initialize navigate
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(`${baseUrl}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setUsers(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(t('userDatabase.loadError'));
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const getFullName = (personalDetails, dashboardLang) => {
    if (!personalDetails) return t('userDatabase.notAvailable');
  
    const { title, firstName, middleName, lastName } = personalDetails;
  
    return dashboardLang === "ru"
      ? `${lastName || ""} ${firstName || ""} ${middleName || ""}`.trim()
      : `${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();
  };
  

  const exportToCSV = () => {
    if (users.length === 0) return;

    const headers = `\uFEFF${t('userDatabase.tableHeaderFullName')},${t('userDatabase.tableHeaderEmail')}\n`;
    const csvContent = users.reduce((acc, user) => {
      const fullName = getFullName(user.personalDetails);
      return `${acc}"${fullName.replace(/"/g, '""')}","${user.email.replace(/"/g, '""')}"\n`;
    }, headers);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter((user) => {
    const emailMatch = user.email?.toLowerCase().includes(searchQuery.toLowerCase());
  
    const fullName = getFullName(user.personalDetails, i18n.language || "en").toLowerCase();
    const nameMatch = fullName.includes(searchQuery.toLowerCase());
  
    return emailMatch || nameMatch;
  });
  

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowClick = (email) => {
    navigate(`/userbase/userbase-details/${email}`);  // Navigate to UserDatabaseDetails
  };

  return (
    <div className="user-database-container">

      <div className="controls-container">
        <div className="user-search-container">
          <FaSearch className="user-search-icon" />
          <input
            type="text"
            placeholder={t('userDatabase.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearch}
            className="user-search-input"
          />
        </div>
        <button 
          className="export-button"
          onClick={exportToCSV}
          disabled={users.length === 0}
          title={users.length === 0 ? t('userDatabase.exportDisabledTooltip') : ''}
        >
          <FaFileExport className="export-icon" />
          {t('userDatabase.exportButton')}
        </button>
      </div>

      {isLoading ? (
  <div className="table-container fade-in-animation">
  <div className="table-scroll-wrapper">
    <table className="user-table">
      <thead>
        <tr>
          <th>{t('userDatabase.tableHeaderId')}</th>
          <th>{t('userDatabase.tableHeaderFullName')}</th>
          <th>{t('userDatabase.tableHeaderEmail')}</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 10 }).map((_, index) => (
          <tr key={index} className="table-row">
            <td><Skeleton width={40} duration={1.2} highlightColor="#f0f0f0" baseColor="#e0e0e0" /></td>
            <td><Skeleton width="80%" duration={1.2} highlightColor="#f0f0f0" baseColor="#e0e0e0" /></td>
            <td><Skeleton width="70%" duration={1.2} highlightColor="#f0f0f0" baseColor="#e0e0e0" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
) : error ? (
  <p className="error-message">{error}</p>
) : (
  <>
    <div className="table-container">
      <div className="table-scroll-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>{t('userDatabase.tableHeaderId')}</th>
              <th>{t('userDatabase.tableHeaderFullName')}</th>
              <th>{t('userDatabase.tableHeaderEmail')}</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((user, index) => (
                <tr 
                  key={user._id || index} 
                  className="table-row clickable-row"  
                  onClick={() => handleRowClick(user.email)}
                >
                  <td>{user._id || indexOfFirstItem + index + 1}</td>
                  <td>{getFullName(user.personalDetails)}</td>
                  <td>{user.email}</td>
                </tr>
              ))
            ) : (
              <tr className="table-row">
                <td colSpan="3">{t('userDatabase.noUsersFound')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {filteredUsers.length > itemsPerPage && (
      <div className="user-pagination-container">
        <div className="user-pagination">
          {/* Previous button */}
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="user-pagination-button"
            title={currentPage === 1 ? t('userDatabase.previousPageDisabled') : ''}
          >
            <FaAngleLeft />
          </button>

          {/* Current page indicator */}
          <span className="user-pagination-current-page">
            {currentPage}
          </span>

          {/* Next button */}
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="user-pagination-button"
            title={currentPage === totalPages ? t('userDatabase.nextPageDisabled') : ''}
          >
            <FaAngleRight />
          </button>
        </div>
      </div>
    )}
  </>
)}

    </div>
  );
};

export default UserDatabase;
