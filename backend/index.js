import express from 'express';
import firebaseConfigRoutes from './config/firebase-config.js';
import discordRoutes from './routes/discordRoutes.js';
import gradesRoute from './routes/gradesRoute.js'
import cors from 'cors';

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], 
  credentials: true
}));

app.use(express.json());
app.use(firebaseConfigRoutes);
app.use("/api/discord", discordRoutes);
app.use("/api/grades", gradesRoute);

app.listen(5001, () => {
  console.log("Server is running on http://localhost:5001");
});