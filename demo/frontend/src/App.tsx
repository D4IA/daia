import { Route, Routes } from 'react-router-dom';
import { Car } from './pages/car/Car';
import { CarScanning } from './pages/car/CarScanning';
import { NotFound } from './pages/notFound';
import { Gate } from './pages/gate/Gate';
import { Home } from './pages/Home';
import { SpectatorPage } from './pages/spectator';

export function App() {
	return (
		<main className="main-content">
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/gate" element={<Gate />} />
				<Route path="/car" element={<CarScanning />} />
				<Route path="/car/handle" element={<Car />} />
				<Route path="/spectator" element={<SpectatorPage />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</main>
	);
}
