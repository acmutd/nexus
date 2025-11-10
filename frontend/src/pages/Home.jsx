import { Link } from 'react-router-dom';

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

const GradeCircle = ({ grade }) => {
  const radius = 30; 
  const stroke = 5;
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
        stroke="#6366F1"
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
        className="text-white text-sm font-bold"
      >
        {grade}%
      </text>
    </svg>
  );
};

const Home = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start bg-blue-900 bg-no-repeat bg-cover bg-center pt-20 pb-10"
      style={{ backgroundImage: "url('/assets/HomeBG.svg')" }}
    >
      <h1 className="text-white text-4xl font-bold mb-10 text-center">
        Welcome Back <span className="text-blue-400">Tommy</span>
      </h1>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 w-11/12 max-w-5xl border border-white/20 flex flex-col items-center overflow-y-auto max-h-[85vh]">
        <h2 className="text-white text-2xl font-semibold mb-6 text-center">
          What do you want to do today?
        </h2>

        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {['Discord', 'Superdoc', 'Grade Calc', 'Settings'].map((name) => (
            <div key={name} className="flex flex-col items-center">
              <div
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-36 h-28 hover:bg-white/20 transition cursor-pointer bg-cover bg-center"
                style={{ backgroundImage: `url('/assets/${name} Button.svg')` }}
              ></div>
              <span className="text-white text-sm font-semibold mt-2">
                {name === 'Discord' ? 'Discord Servers' : name}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Activity*/}
        <div className="bg-blue-900 backdrop-blur-lg rounded-xl shadow-lg p-3 w-full text-white mb-4">
          <h3 className="text-lg font-semibold mb-1">Recent Activity</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>Logged in</li>
            <li>Viewed Superdoc</li>
          </ul>
        </div>

        {/*Grades */}
        <div className="bg-blue-900 backdrop-blur-lg rounded-xl shadow-lg p-6 w-full text-white max-h-[500px] overflow-x-auto overflow-y-hidden">
          <h3 className="text-xl font-semibold mb-4">Grades</h3>
          <div className="flex gap-8">
            {gradesData.map((item) => {
              const finalGrade = calculateWeightedGrade(
                item.homework,
                item.exam,
                item.weights
              );
              return (
                <div key={item.subject} className="flex flex-col items-center min-w-[180px]">
                  <GradeCircle grade={finalGrade} />
                  <span className="text-white text-lg font-semibold mt-2">{item.subject}</span>
                  <div className="flex flex-col text-sm text-gray-300 mt-1 text-center">
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
