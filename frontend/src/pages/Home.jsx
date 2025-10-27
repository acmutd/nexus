import { Link } from 'react-router-dom';

const gradesData = [
  { subject: 'Math', grade: 95 },
  { subject: 'Science', grade: 89 },
  { subject: 'History', grade: 92 },
  { subject: 'English', grade: 87 },
  { subject: 'Computer Science', grade: 99 },
  { subject: 'Art', grade: 93 },
  { subject: 'Music', grade: 96 },
];

const GradeCircle = ({ grade }) => {
  const radius = 20;
  const stroke = 4;
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
        strokeDasharray={circumference + ' ' + circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-white text-xs font-bold"
      >
        {grade}%
      </text>
    </svg>
  );
};

const Home = () => {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start bg-blue-950 bg-no-repeat bg-cover bg-center pt-20 pb-10"
      style={{ backgroundImage: "url('/assets/HomeBG.svg')" }}
    >
      <h1 className="text-white text-4xl font-bold mb-10 text-center">
        Welcome Back <span className="text-blue-400">Tommy</span>
      </h1>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 w-11/12 max-w-3xl border border-white/20 flex flex-col items-center overflow-y-auto max-h-[70vh]">
        <h2 className="text-white text-2xl font-semibold mb-6 text-center">
          What do you want to do today?
        </h2>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-36 h-28 flex items-center justify-center text-white text-center hover:bg-white/20 transition cursor-pointer">
            Discord Servers
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-36 h-28 flex items-center justify-center text-white text-center hover:bg-white/20 transition cursor-pointer">
            Superdoc
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-36 h-28 flex items-center justify-center text-white text-center hover:bg-white/20 transition cursor-pointer">
            Grade Calc
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-36 h-28 flex items-center justify-center text-white text-center hover:bg-white/20 transition cursor-pointer">
            Settings
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-full text-white mb-6 max-h-48 overflow-y-auto">
          <h3 className="text-xl font-semibold mb-2">Recent Activity</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>Logged in</li>
            <li>Viewed Superdoc</li>
          </ul>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg p-6 w-full text-white max-h-48 overflow-y-auto">
          <h3 className="text-xl font-semibold mb-4">Grades</h3>
          <ul className="space-y-4">
            {gradesData.map((item) => (
              <li key={item.subject} className="flex items-center gap-4">
                <GradeCircle grade={item.grade} />
                <span className="text-white">{item.subject}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
