import React from "react";

const WebinarForm = ({ formData, setFormData, handleSubmit, translations, selectedLanguage, setIsModalOpen }) => {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "date") {
      const dayOfWeek = getDayOfWeek(value, selectedLanguage);
      setFormData((prev) => ({
        ...prev,
        dayOfWeek,
        dayOfWeekRussian: getDayOfWeek(value, "Russian"),
      }));
    }
  };

  const getDayOfWeek = (date, lang) => {
    const days = {
      English: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      Russian: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    };
    return days[lang][new Date(date).getDay()];
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>{formData.id ? translations[selectedLanguage].updateWebinar : translations[selectedLanguage].addWebinarForm}</h3>
        
        <form onSubmit={handleSubmit}>
          <label>{translations[selectedLanguage].title}</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required />

          <label>{translations[selectedLanguage].titleRussian}</label>
          <input type="text" name="titleRussian" value={formData.titleRussian} onChange={handleChange} required />

          <label>{translations[selectedLanguage].date}</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />

          <label>{translations[selectedLanguage].time}</label>
          <input type="time" name="time" value={formData.time} onChange={handleChange} required />

          <label>{translations[selectedLanguage].dayOfWeek}</label>
          <input type="text" name="dayOfWeek" value={formData.dayOfWeek} disabled />

          <label>{translations[selectedLanguage].dayOfWeekRussian}</label>
          <input type="text" name="dayOfWeekRussian" value={formData.dayOfWeekRussian} disabled />

          <label>{translations[selectedLanguage].chiefGuestName}</label>
          <input type="text" name="chiefGuestName" value={formData.chiefGuestName} onChange={handleChange} required />

          <label>{translations[selectedLanguage].chiefGuestNameRussian}</label>
          <input type="text" name="chiefGuestNameRussian" value={formData.chiefGuestNameRussian} onChange={handleChange} required />

          <label>{translations[selectedLanguage].regalia}</label>
          <input type="text" name="regalia" value={formData.regalia} onChange={handleChange} required />

          <label>{translations[selectedLanguage].regaliaRussian}</label>
          <input type="text" name="regaliaRussian" value={formData.regaliaRussian} onChange={handleChange} required />

          <label>{translations[selectedLanguage].liveEmbed}</label>
          <input type="text" name="liveEmbed" value={formData.liveEmbed} onChange={handleChange} required />

          <label>{translations[selectedLanguage].eventSiteURL}</label>
          <input type="text" name="eventSiteURL" value={formData.eventSiteURL} onChange={handleChange} required />

          <label>{translations[selectedLanguage].chatEmbed}</label>
          <input type="text" name="chatEmbed" value={formData.chatEmbed} onChange={handleChange} />

          <label>{translations[selectedLanguage].bannerUrl}</label>
          <input type="text" name="bannerUrl" value={formData.bannerUrl} onChange={handleChange} required />

          <label>{translations[selectedLanguage].bannerRussianURL}</label>
          <input type="text" name="bannerRussianURL" value={formData.bannerRussianURL} onChange={handleChange} required />

          <label>{translations[selectedLanguage].photoUrl}</label>
          <input type="text" name="photoUrl" value={formData.photoUrl} onChange={handleChange} required />

          <div className="form-buttons">
            <button type="submit">{formData.id ? translations[selectedLanguage].updateWebinar : translations[selectedLanguage].addWebinarForm}</button>
            <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebinarForm;
