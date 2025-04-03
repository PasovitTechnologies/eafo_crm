import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaFileExport, FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";  // Import useNavigate
import "./UserDatabase.css";

const UserDatabase = () => {
  const { t } = useTranslation();
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

  const getFullName = (personalDetails) => {
    if (!personalDetails) return t('userDatabase.notAvailable');
    const { title, firstName, middleName, lastName } = personalDetails;
    return `${title || ""} ${firstName || ""} ${middleName || ""} ${lastName || ""}`.trim();
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

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <p className="loading-message">{t('userDatabase.loadingUsers')}</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <div className="table-container">
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

          {filteredUsers.length > itemsPerPage && (
            <div className="user-pagination-container">
              <div className="user-pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="user-pagination-button"
                  title={currentPage === 1 ? t('userDatabase.previousPageDisabled') : ''}
                >
                  <FaAngleLeft />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`user-pagination-button ${currentPage === number ? 'active' : ''}`}
                  >
                    {number}
                  </button>
                ))}
                
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
