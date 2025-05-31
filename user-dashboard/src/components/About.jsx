import React, { useEffect, useRef } from "react";
import "./About.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft} from 'lucide-react';

const companies = [
  {
    id: 1,
    name: "Eurasian Federation of Oncology (EAFO)",
    website: "www.eafo.info",
    logo: "https://static.wixstatic.com/media/e6f22e_781602499b8d4d1ab525fdf99ef8ac74~mv2_d_2156_2156_s_2.png",
    info: "Eurasian Federation of Oncology (EAFO) is an autonomous professional organization uniting oncologists, other healthcare professionals, anti-cancer & anti-tobacco advocates, patients, survivors, journalists, policy makers, oncology & anti-cancer organizations and others interested in combating cancer from all parts of Asia, Europe and beyond. The organization has its focus on long-term initiatives dedicated to the health and well being of cancer patients, cancer survivors, healthy individuals, initiatives that foster innovations, collegiality, cooperation and professional development primarily through educational programs.",
    nameRussian:"Евразийская федерация онкологии (ЕАФО)",
    infoRussian: "Евразийская федерация онкологии (ЕАФО) - это автономная профессиональная организация, объединяющая онкологов, специалистов здравоохранения, противораковые организации,антитабачных и противораковых активистов, пациентов, переживших рак, журналистов, политиков  и других заинтересованных в борьбе против рака из всех частей Евразии и за ее пределами. Организация сосредоточена на долгосрочных инициативах, посвященных здоровью и благополучию онкологических больных, здоровых и переживших рак людей, а так же инициативах, способствующих инновациям, коллегиальности, сотрудничеству и профессиональному развитию, в первую очередь - через образовательные программы."
  },
  {
    id: 2,
    name: "Forum for Interdisciplinary Research in Medical Science and Technology (FIRMST)",
    website: "www.firmst.tech",
    logo: "https://static.wixstatic.com/media/e6f22e_3e000f82d80b4c61a07548791189a765~mv2.png",
    info: "FIRMST is an initiative to encourage and support innovative ideas in young minds, thereby reducing the gaps between professionals of various medical specialties amongst themselves, and experts in allied sciences.",
    nameRussian:"Форум по интердисциплинарным исследованиям в медицинской науке и технологиях (FIRMST)",
    infoRussian: "FIRMST - это инициатива, направленная на поощрение и поддержку инновационных идей в молодых умах. Тем самым мы сокращаем разрыв между профессионалами и экспертами различных медицинских специальностей и смежных науках."
  },
  {
    id: 3,
    name: "Eurasian Cancer Research Council (ECRC)",
    website: "www.ecrc.pro",
    logo: "https://static.wixstatic.com/media/e6f22e_4365cbc96859456682971bc081e8f938~mv2.png",
    info: "Eurasian Cancer Research Council (ECRC) is a NOT-FOR-PROFIT organisation specializing in conducting and promoting collaborative Cancer Research beyond borders across continents.",
    nameRussian:"Евразийский совет по исследованиям рака (ECRC)",
    infoRussian: "Евразийский совет по исследованию рака (ECRC) - НЕКОММЕРЧЕСКАЯ организация, специализирующаяся на проведении и продвижении кооперированных исследований в онкологии по всему миру"
  },
  {
    id: 4,
    name: "Eurasian Society of Head and Neck Oncology (EASHNO)",
    website: "www.eashno.org",
    logo: "https://static.wixstatic.com/media/df6cc5_7e031cf4148844dbb519770deda8d999~mv2.png",
    info: "Eurasian Society of Head and Neck Oncology (EASHNO) is a autonomous professional organization uniting a group of head and neck cancer specialists from different countries.",
    nameRussian:"Евразийское сообщество по онкологии головы и шеи (EASHNO)",
    infoRussian: "Евразийское общество онкологов головы и шеи (EASHNO) - автономная профессиональная организация, объединяющая группу специалистов по онкологии головы и шеи из разных стран."
  },
  {
    id: 5,
    name: "PathoLogica Service",
    website: "www.pathologica.ru",
    logo: "https://static.wixstatic.com/media/e6f22e_d0a90e8a47ff4d6681bb217853035d51~mv2.png",
    info: "Eurasian Cancer Research Council (ECRC) is a NOT-FOR-PROFIT organisation specializing in conducting and promoting collaborative Cancer Research beyond borders across continents.",
    nameRussian:"PathoLogica Service",
    infoRussian: "PathoLogica Service — это общественно направленный проект, созданный с целью повышения доступности качественной диагностики онкологических заболеваний в России и странах СНГ. Эксперты PathoLogica Service выполняют исследования на современном оборудовании и коллегиально устанавливают диагноз в самых сложных случаях."
  },
  {
    id: 6,
    name: "Eurasian Cancer Foundation (EACF)",
    website: "www.eacf.info",
    logo: "https://static.wixstatic.com/media/e6f22e_2c208aba4029489db115cd9c7805ee8b~mv2.png",
    info: "PathoLogica Service is a socially oriented project created to increase the availability of high–quality diagnostics of oncological diseases in Russia and the CIS countries. Utilising cutting-edge techniques and equipment, the experts at PathoLogica Service collectively provide comprehensive morphological reports for even the most challenging cases.",
    nameRussian:"Евразийский противораковый фонд (EACF)",
    infoRussian: "Деятельность фонда направлена на изменение ситуации в области борьбы с раковыми заболеваниями в России и повышение доступности квалифицированной помощи онкологическим пациентам. Фонд собрал команду высококвалифицированных специалистов – практикующих врачей-онкологов."
  },
  {
    id: 7,
    name: "REMESLO DOBRA Foundation",
    website: "http://remeslodobra.ru/",
    logo: "https://static.wixstatic.com/media/e6f22e_5da0b7344fbd41f8855314057a03960e~mv2.jpg",
    info: "“REMESLO DOBRA Fund” is a non-profit organisation that provides shelter for people in difficult situations. Its mission is the social adaptation of unemployed and homeless individuals who are wards of charitable foundations and social state institutions in Moscow and the Moscow region.",
    nameRussian:"Фонд помощи социально незащищенным людям “Ремесло добра”",
    infoRussian: "Фонд Ремесло добра - некоммерческая организация, которая занимается приютом для людей в трудной жизненной ситуации. Задачей фонда является социальная адаптация безработных и бездомных подопечных благотворительных фондов и социальных государственных учреждений Москвы и Московской области."
  },
  {
    id: 8,
    name: "FIRMST Study Abroad",
    website: "sa.firmst.tech",
    logo: "https://static.wixstatic.com/media/df6cc5_41088f6e2d0f44d18b1c7c097947d2cc~mv2.png",
    info: "FIRMST Study Abroad is a platform for tailoring personalized plan for international clinical or scientific rotations in many fields of Medicine and Allied Sciences. We are aimed to facilitate a better experience of away externships by working with reliable partner institutions, orchestrating official paperwork and helping deal with organizational issues before and during the rotation.",
    nameRussian:"FIRMST Обучение за рубежом",
    infoRussian: "FIRMST Study Abroad – это платформа для организации персонализированных программ клинических и научных стажировок в различных областях медицины и смежных наук. Мы нацелены обеспечить достойный опыт зарубежных ротаций за счет партнёрства с надежными учреждениями, помощи с официальными документами и организационными вопросами до и во время стажировки."
  },
  {
    id: 9,
    name: "PASOVIT",
    website: "www.pasovit.com",
    logo: "https://static.wixstatic.com/media/e6f22e_c6be80083cbc4ea1bf104f638dc7e4c2~mv2.png",
    info: "We work together building high-quality software on demand. Our team includes consultants, product designers, software developers, QA testers, product managers, and product owners. ",
    nameRussian:"PASOVIT",
    infoRussian: "Мы работаем вместе, создавая высококачественное программное обеспечение по индивидуальному запросу. В нашу команду входят консультанты, дизайнеры продуктов, разработчики программного обеспечения, тестировщики контроля качества, менеджеры по продуктам и продакт-оунеры."
  },
  {
    id: 10,
    name: "Health-Direct",
    website: "www.health-direct.info",
    logo: "https://static.wixstatic.com/media/e6f22e_fdcb658ef9ee4f718cca491d457c3b53~mv2.png",
    info: "Health-Direct is headed by leading surgeons in the field of oncogynecology, head and neck oncology, skin tumors and melanoma. We are responsible for the selection of first-class surgeons, the coordination of your drug therapy (chemotherapy, hormone therapy, targeted therapy, immunotherapy), radiotherapy and prompt follow-up examinations.",
    nameRussian:"Health-Direct",
    infoRussian: "Health-Direct возглавляют ведущие хирурги в области онкогинекологии, онкологии головы и шеи, лечения опухолей кожи и меланомы. Мы берем на себя заботы по подбору первоклассных хирургов, согласованию лекарственной (химиотерапия, гормонотерапия, таргетная терапия, иммунотерапия) или лучевой терапии и оперативному проведению дообследований. "
  }
];

const About = () => {
  const companyRefs = useRef([]);
  const navigate = useNavigate();
  const { t,i18n } = useTranslation();  // Use i18n for language detection

  useEffect(() => {
    // ✅ Check if token is available in localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");  // Redirect to / if token is missing
    }
  }, [navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in");
          }
        });
      },
      { threshold: 0.1 }
    );

    companyRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleGoBack = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="about-container">
      <div className="aboutus-navigation">
         <button
                    type="button"
                    className="back-button"
                    aria-label={t("forgetPasswordPage.backToLogin")}
                    onClick={handleGoBack}
                  >
                    <ArrowLeft className="back-icon" />
                  </button>
      <div className="about-breadcrumb">
          <span onClick={() => navigate("/dashboard")}>{t("courses.dashboard")}</span> /{" "}
          <span>{i18n.language === "ru" ? "О нас" : "About us"}</span>
        </div>
      </div>

      <h1 className="about-title">
        {i18n.language === "ru" ? "О нас" : "About us"}
      </h1>

      <div className="company-list">
        {companies.map((company, index) => (
          <div
            key={company.id}
            ref={(el) => (companyRefs.current[index] = el)}
            className="company-row hidden"
          >
            <img
              src={company.logo}
              alt={company.name}
              className="company-logo"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/placeholder.png";
              }}
            />
            
            <div className="company-details">
              <h2 className="company-name">
                {i18n.language === "ru" ? company.nameRussian : company.name}
              </h2>
              <p className="company-info">
                {i18n.language === "ru" ? company.infoRussian : company.info}
              </p>
            </div>

            <div className="company-actions">
              {company.website !== "#" ? (
                <a
                  href={`https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="website-btn"
                >
                  {i18n.language === "ru" ? "Посетить сайт" : "Visit Website"}
                </a>
              ) : (
                <span className="no-website">
                  {i18n.language === "ru"
                    ? "Сайт недоступен"
                    : "Website not available"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
