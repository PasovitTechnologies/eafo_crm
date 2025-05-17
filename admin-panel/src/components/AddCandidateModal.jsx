import { useState, useEffect } from 'react';
import './add-candidate-modal.css';

function AddCandidateModal({ onClose, groupid }) {
  const [selectionType, setSelectionType] = useState('all');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [packageQuery, setPackageQuery] = useState('');
  const [matchingPackages, setMatchingPackages] = useState([]);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [userFilterType, setUserFilterType] = useState('default');
  const [webinars, setWebinars] = useState([]);
  const [selectedWebinar, setSelectedWebinar] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0 });
  const [failedUsers, setFailedUsers] = useState([]);
  const [isProcessed, setIsProcessed] = useState(false);

  const baseUrl = import.meta.env.VITE_BASE_URL;
  const token =localStorage.getItem("token")

 

  useEffect(() => {
    if (!token) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const coursesResponse = await fetch(`${baseUrl}/api/courses`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);

        const webinarsResponse = await fetch(`${baseUrl}/api/webinars`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const webinarsData = await webinarsResponse.json();
        console.log('Fetched webinars:', webinarsData.map(w => ({ _id: w._id, title: w.title })));
        setWebinars(webinarsData);

        setLoading(false);
      } catch (err) {
        console.error('Initial data fetch error:', err);
        setError('Failed to fetch initial data');
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [token]);

  const fetchUsers = async (type, params = {}) => {
    try {
      setLoading(true);
      let fetchedUsers = [];

      if (type === 'all') {
        console.log('Fetching all users');
        setUsers([]);
        setSelectedUsers([]);
        setFilteredUsers([]);
        const response = await fetch(`${baseUrl}/api/user/fetch/all-users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`

          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        fetchedUsers = await response.json();
        console.log('Raw fetched users:', fetchedUsers.length);

        const uniqueUsers = Array.from(
          new Map(fetchedUsers.map(user => [user.email, user])).values()
        );
        console.log('Unique users after deduplication:', uniqueUsers.length);

        setUsers(uniqueUsers);
        setSelectedUsers(uniqueUsers.map(user => user.email));
        setFilteredUsers([]);
        console.log('State updated - users:', uniqueUsers.length, 'selectedUsers:', uniqueUsers.length);
      } else if (type === 'courses') {
        const { packageName, paymentStatus } = params;
        const course = courses.find(c => c._id === selectedCourse);
        if (!course) {
          console.error('Course not found for ID:', selectedCourse);
          setError('Course not found');
          setLoading(false);
          return;
        }
        console.log('Fetching users for course - Name:', course.name, 'Package:', packageName, 'Payment Status:', paymentStatus);
        console.log('Request payload:', { courseName: course.name, packageName, paymentStatus });

        const response = await fetch(`${baseUrl}/api/courses/fetch/filter-courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courseName: course.name, packageName, paymentStatus })
        });

        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Raw response data:', data);

        const usersArray = data.users || [];
        console.log('Extracted users array:', usersArray);

        if (!Array.isArray(usersArray)) {
          console.error('Users data is not an array. Received:', usersArray);
          setError('No users found');
          setLoading(false);
          return;
        }

        console.log('Fetched users count:', usersArray.length);
        const uniqueUsers = Array.from(
          new Map(usersArray.map(user => [user.email.toLowerCase(), {
            email: user.email,
            personalDetails: { firstName: user.firstName || 'Unknown', lastName: user.lastName || '' }
          }])).values()
        );
        console.log('Unique users after deduplication:', uniqueUsers);

        setUsers(uniqueUsers);
        setFilteredUsers(uniqueUsers);
        setSelectedUsers([]);
        console.log('State updated - users:', uniqueUsers.length, 'filteredUsers:', uniqueUsers.length);
      } else if (type === 'webinars') {
        const { webinarId } = params;
        const webinar = webinars.find(w => w._id === webinarId);
        if (!webinar) {
          setError('Webinar not found');
          setLoading(false);
          return;
        }
        console.log('Fetching users for webinar - ID:', webinarId, 'Title:', webinar.title);

        const participantEmails = Array.from(
          new Set(
            webinar.participants
              .filter(p => p.status === 'Registered' && p.email && typeof p.email === 'string')
              .map(p => p.email.toLowerCase())
          )
        );
        console.log('Participant emails:', participantEmails.length, participantEmails);

        const userPromises = participantEmails.map(async (email) => {
          try {
            const response = await fetch(`${baseUrl}/api/user/${email}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const userData = await response.json();
              return {
                email: userData.email,
                personalDetails: userData.personalDetails || { firstName: 'Unknown', lastName: '' }
              };
            } else if (response.status === 404) {
              console.warn(`User not found for email: ${email}`);
              return { email, personalDetails: { firstName: 'Unknown', lastName: '' } };
            } else {
              console.error(`Failed to fetch user ${email}: ${response.status} ${response.statusText}`);
              return { email, personalDetails: { firstName: 'Unknown', lastName: '' } };
            }
          } catch (err) {
            console.error(`Error fetching user ${email}:`, err.message);
            return { email, personalDetails: { firstName: 'Unknown', lastName: '' } };
          }
        });

        const matchedUsers = await Promise.all(userPromises);
        console.log('Fetched user details:', matchedUsers);

        const uniqueUsers = Array.from(
          new Map(matchedUsers.map(user => [user.email.toLowerCase(), user])).values()
        );

        console.log('Matched webinar users:', uniqueUsers.length);

        if (uniqueUsers.length !== participantEmails.length) {
          console.warn(`Mismatch in participant count: Expected ${participantEmails.length}, got ${uniqueUsers.length}`);
          setError(`Some participants may not have user profiles. Displaying ${uniqueUsers.length} of ${participantEmails.length} registered participants.`);
        }

        setUsers(uniqueUsers);
        setFilteredUsers(uniqueUsers);
        setSelectedUsers([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError('Failed to fetch users: ' + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleSelectionTypeChange('all');
    }
  }, [token]);

  const handleSelectionTypeChange = (type) => {
    console.log('Selection type changed to:', type);
    setSelectionType(type);
    setSelectedCourse('');
    setPackageQuery('');
    setMatchingPackages([]);
    setShowPackageDropdown(false);
    setSelectedPackage('');
    setUserFilterType('default');
    setSelectedWebinar('');
    setUsers([]);
    setFilteredUsers([]);
    setSelectedUsers([]);
    setUserSearch('');
    setError(null);

    if (type === 'all') {
      fetchUsers('all');
    }
  };

  useEffect(() => {
    setSelectedPackage('');
    setPackageQuery('');
    setMatchingPackages([]);
    setShowPackageDropdown(false);
    setUserFilterType('default');
    setUsers([]);
    setFilteredUsers([]);
    setSelectedUsers([]);
  }, [selectedCourse]);

  const handlePackageSearch = (query) => {
    setPackageQuery(query);
    setShowPackageDropdown(!!query);

    if (!selectedCourse || !query) {
      setMatchingPackages([]);
      setShowPackageDropdown(false);
      return;
    }

    const course = courses.find(c => c._id === selectedCourse);
    if (!course) return;

    const packageNames = [...new Set(course.items.map(item => item.name))];
    const filteredPackages = packageNames.filter(pkg =>
      pkg.toLowerCase().includes(query.toLowerCase())
    );
    setMatchingPackages(filteredPackages);
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setPackageQuery('');
    setMatchingPackages([]);
    setShowPackageDropdown(false);
    if (selectedCourse && pkg) {
      fetchUsers('courses', { packageName: pkg, paymentStatus: userFilterType });
    }
  };

  useEffect(() => {
    if (selectedCourse && selectedPackage) {
      fetchUsers('courses', { packageName: selectedPackage, paymentStatus: userFilterType });
    }
  }, [userFilterType, selectedCourse, selectedPackage]);

  const handleWebinarSelect = () => {
    if (selectedWebinar) {
      console.log('Selected webinar ID:', selectedWebinar);
      fetchUsers('webinars', { webinarId: selectedWebinar });
    }
  };

  useEffect(() => {
    if (selectionType === 'webinars' && selectedWebinar) {
      handleWebinarSelect();
    }
  }, [webinars, selectedWebinar]);

  const handleUserSearch = (searchTerm) => {
    setUserSearch(searchTerm);
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(user => {
      const fullName = `${user.personalDetails?.firstName || ''} ${user.personalDetails?.lastName || ''}`.trim();
      return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredUsers(filtered);
  };

  const handleUserSelect = (email) => {
    setSelectedUsers(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSubmit = async () => {
    try {
      setProcessing(true);
      setError(null);
      setFailedUsers([]);
      setIsProcessed(false);

      let usersToProcess = [];
      if (selectionType === 'all') {
        usersToProcess = users;
      } else {
        usersToProcess = users.filter(user => selectedUsers.includes(user.email));
      }

      if (usersToProcess.length === 0) {
        setError('No users selected');
        setProcessing(false);
        return;
      }

      console.log('Submitting users:', usersToProcess.length);
      setProcessingStatus({ current: 0, total: usersToProcess.length });

      const payload = usersToProcess.map(user => ({
        groupid,
        courseId: selectionType === 'courses' ? selectedCourse : undefined,
        packageName: selectionType === 'courses' ? selectedPackage : undefined,
        webinarId: selectionType === 'webinars' ? selectedWebinar : undefined,
        firstName: user.personalDetails?.firstName || 'Unknown',
        lastName: user.personalDetails?.lastName || '',
        email: user.email
      }));

      const response = await fetch(`${baseUrl}/api/candidates/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ candidates: payload })
      });

      if (!response.ok) {
        throw new Error(`Failed to create candidates: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (response.ok) {
        setFailedUsers(data.failed || []);
        setProcessing(false);
        setIsProcessed(true);
      } else {
        setError(data.message || 'Failed to create candidates');
        setProcessing(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Error creating candidates: ' + err.message);
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (processing && processingStatus.current < processingStatus.total) {
      const timer = setTimeout(() => {
        setProcessingStatus(prev => ({
          ...prev,
          current: prev.current + 1
        }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [processing, processingStatus]);

  return (
    <div className="add-candidate-modal-overlay">
      <div className="add-candidate-modal">
        <button className="add-candidate-modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>
        <div className="add-candidate-modal-form">
          {processing ? (
            <div className="add-candidate-processing-container">
              <h2>Processing Candidates...</h2>
              <p>Processing... ({processingStatus.current}/{processingStatus.total})</p>
            </div>
          ) : isProcessed ? (
            <div className="add-candidate-processing-container">
              <h2>
                <span className="tick-icon">✔</span> Processed
              </h2>
              {failedUsers.length > 0 && (
                <div className="add-candidate-error">
                  Failed: {failedUsers.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <>
              <h2>Add Candidates</h2>
              {loading && <div className="add-candidate-loading">Loading...</div>}
              {error && <div className="add-candidate-error">{error}</div>}

              <div className="add-candidate-modal-form-group">
                <label htmlFor="selectionType">Select Option</label>
                <select
                  id="selectionType"
                  value={selectionType}
                  onChange={(e) => handleSelectionTypeChange(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="courses">Courses</option>
                  <option value="webinars">Webinars</option>
                </select>
              </div>

              {selectionType === 'all' && (
                <div className="add-candidate-modal-form-group">
                  <p>Total users selected: {selectedUsers.length}</p>
                </div>
              )}

              {selectionType === 'courses' && (
                <>
                  <div className="add-candidate-modal-form-group">
                    <label htmlFor="course">Select Course</label>
                    <select
                      id="course"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      <option value="">-- Select a Course --</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCourse && (
                    <div className="add-candidate-modal-form-group">
                      <label htmlFor="packageSearch">Search Package Name</label>
                      <div className="package-search-container">
                        <input
                          id="packageSearch"
                          type="text"
                          value={packageQuery}
                          onChange={(e) => handlePackageSearch(e.target.value)}
                          placeholder="Type to search packages..."
                          onFocus={() => packageQuery && setShowPackageDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPackageDropdown(false), 200)}
                        />
                        {showPackageDropdown && matchingPackages.length > 0 && (
                          <ul className="package-dropdown">
                            {matchingPackages.map(pkg => (
                              <li
                                key={pkg}
                                className="package-dropdown-item"
                                onMouseDown={() => handlePackageSelect(pkg)}
                              >
                                {pkg}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {selectedPackage && (
                        <>
                          <p>Selected Package: {selectedPackage}</p>
                          <div className="user-filter-toggle">
                            <div
                              className={`toggle-container ${userFilterType === 'default' ? 'default' : 'paid'}`}
                              onClick={() => setUserFilterType(userFilterType === 'default' ? 'paid' : 'default')}
                            >
                              <div className="toggle-option toggle-default">Default</div>
                              <div className="toggle-option toggle-paid">Paid Users</div>
                              <div className="toggle-indicator"></div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectionType === 'webinars' && (
                <div className="add-candidate-modal-form-group">
                  <label htmlFor="webinar">Select Webinar</label>
                  <select
                    id="webinar"
                    value={selectedWebinar}
                    onChange={(e) => {
                      setSelectedWebinar(e.target.value);
                      handleWebinarSelect();
                    }}
                  >
                    <option value="">-- Select a Webinar --</option>
                    {webinars.map(webinar => (
                      <option key={webinar._id} value={webinar._id}>
                        {webinar.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectionType === 'courses' && selectedPackage) || (selectionType === 'webinars' && selectedWebinar) ? (
                <>
                  <div className="add-candidate-modal-form-group">
                    <label htmlFor="userSearch">Search Users</label>
                    <input
                      id="userSearch"
                      type="text"
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      placeholder="Search by name or email..."
                    />
                  </div>

                  <div className="add-candidate-modal-form-group">
                    <p>Total users selected: {selectedUsers.length}</p>
                    <button className="add-candidate-select-all-btn" onClick={() => {
                      if (selectedUsers.length === filteredUsers.length) {
                        setSelectedUsers([]);
                      } else {
                        setSelectedUsers(filteredUsers.map(user => user.email));
                      }
                    }}>
                      {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="add-candidate-user-list">
                    {filteredUsers.length === 0 ? (
                      <p className="add-candidate-no-users">No users found</p>
                    ) : (
                      filteredUsers.map(user => {
                        console.log('Rendering user:', user);
                        const fullName = `${user.personalDetails?.firstName || 'Unknown'} ${user.personalDetails?.lastName || ''}`.trim();
                        return (
                          <div key={user.email} className="add-candidate-user-option">
                            <label className="add-candidate-checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.email)}
                                onChange={() => handleUserSelect(user.email)}
                              />
                              <span className="add-candidate-checkbox-custom"></span>
                              <span className="add-candidate-user-info">{`${fullName} (${user.email})`}</span>
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : null}

              <div className="add-candidate-form-actions">
                <button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    (selectionType === 'all' && selectedUsers.length === 0) ||
                    (selectionType === 'courses' && !selectedPackage) ||
                    (selectionType === 'webinars' && !selectedWebinar)
                  }
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddCandidateModal;