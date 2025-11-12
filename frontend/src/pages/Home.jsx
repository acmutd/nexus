import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const gradesData = [
  { subject: 'Math', homework: 92, exam: 88, weights: { homework: 0.4, exam: 0.6 } },
  { subject: 'Science', homework: 85, exam: 94, weights: { homework: 0.5, exam: 0.5 } },
  { subject: 'History', homework: 90, exam: 86, weights: { homework: 0.3, exam: 0.7 } },
  { subject: 'English', homework: 96, exam: 89, weights: { homework: 0.5, exam: 0.5 } },
  { subject: 'Computer Science', homework: 99, exam: 97, weights: { homework: 0.4, exam: 0.6 } },
  { subject: 'Art', homework: 95, exam: 91, weights: { homework: 0.6, exam: 0.4 } },
  { subject: 'Music', homework: 94, exam: 98, weights: { homework: 0.5, exam: 0.5 } },
];


const calculateWeightedGrade = (homework, exam, weights) => {
  return Math.round(homework * weights.homework + exam * weights.exam);
};

const GradeCircle = ({ grade, index }) => {
  const colors = ['#60A5FA', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6'];
  const radius = 35; 
  const stroke = 7;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (grade / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="#4F46E5"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="opacity-20"
      />
      <circle
        stroke={colors[index % colors.length]}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        className="text-white text-lg font-bold"
      >
        {grade}%
      </text>
    </svg>
  );
};

const Home = () => {

  return (
    <div className="flex w-full h-full">
      {/* -------------------------------------- BACKGROUND -------------------------------------------*/}
      <div className="flex h-full w-full bg-no-repeat bg-center bg-cover fixed z-0" style={{ backgroundImage: "url('/assets/HomeBG.svg')"}}/>
      
      {/* -------------------------------------- CONTENT -------------------------------------------*/}
      <motion.div className="flex flex-col w-full h-full items-center justify-center mt-35 mb-15 z-1" initial={{opacity:0, y:20}} animate={{opacity: 1, y:0}} transition={{duration: 0.7}}>
        <h1 className="text-white text-4xl font-bold text-center mb-5">
          Welcome Back, {' '} <span className="text-blue-400">[STUDENT NAME]</span>!
        </h1>
        
        <div className="bg-gradient-to-b from-nexus800 via-nexus900 to-nexus800 p-12 w-3/5 max-w-5xl flex flex-col items-center overflow-y-auto rounded-2xl">
          <h2 className="text-white text-3xl font-titilliumWeb-semibold mb-6 w-full">
            What Do You Want To Do Today?
          </h2>

          {/* ----------------------- BUTTONS --------------------------------*/}
          <div className="flex flex-wrap justify-center gap-12 mb-10">
            {['Discord', 'Superdoc', 'Grade Calc', 'Settings'].map((name) => (
              <div key={name} className="flex flex-col items-center">
                <div
                  className="rounded-xl p-6 w-36 h-36 hover:scale-110 transition cursor-pointer bg-cover bg-center"
                  style={{ backgroundImage: `url('/assets/${name} Button.svg')` }}
                  ></div>
                <span className="text-white text-sm font-semibold mt-2">
                  {name === 'Discord' ? 'Discord Servers' : name}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Activity*/}
          <div className="bg-nexus800 rounded-xl p-6 w-full text-white mb-4">
            <h3 className="text-2xl font-titilliumWeb-semibold mb-1">Recent Activity</h3>
            <ul className="text-nexus300 text-lg space-y-1 font-titilliumWeb-regular ">
              <li>Logged in</li>
              <li>Viewed Superdoc</li>
            </ul>
          </div>

          {/*Grades */}
          <div className="flex bg-nexus800 rounded-xl p-6 w-full h-full text-white">
            {/* -------------------- CONTENT ------------------------ */}
            <div className="flex flex-wrap w-full h-fit justify-center items-center">
              <h3 className="flex w-full text-2xl font-titilliumWeb-semibold mb-4">Grades</h3>
              <div className="flex flex-row flex-wrap w-full h-full gap-8">
                {gradesData.map((item, index) => {
                  const finalGrade = calculateWeightedGrade(
                    item.homework,
                    item.exam,
                    item.weights
                  );
                  return (
                    <div key={item.subject} className="flex flex-row justify-center items-center w-fit h-full gap-2">
                      <GradeCircle grade={finalGrade} index={index}/>
                      <div className="flex flex-col items-start justify-center w-fit">
                        <span className="text-white text-lg font-semibold mt-2">{item.subject}</span>
                        <div className="flex flex-col text-sm text-gray-300 text-start">
                          <span>
                            Homework: {item.homework}% ({item.weights.homework * 100}%)
                          </span>
                          <span>
                            Exam: {item.exam}% ({item.weights.exam * 100}%)
                          </span>
                          <span className="text-blue-300 font-semibold">
                            Final: {finalGrade}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
