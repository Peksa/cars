package game;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import pubsub.Pubsub;
import models.Car;
import models.Tick;

public class Game implements Runnable {
	private static Game instance = new Game();
	
	private Map<String, Car> cars = new HashMap<>();
	
	public static Game getInstance() {
		return instance;
	}
	
	private Game() {
		new Thread(this).start();
	}
	
	public void updateCar(String id, Car car) {
		// FIXME check things like speed etc to prevent cheating..
		cars.put(id, car);
	}
	
	public Car getCar(String id) {
		return cars.get(id);
	}
	
	public int getNumberOfCars() {
		return cars.size();
	}
	
	public void removeCar(String id) {
		cars.remove(id);
	}
	
	public List<Car> getCarsExcept(String id) {
		List<Car> ret = new ArrayList<>();
		for (Entry<String, Car> entry : cars.entrySet()) {
			if (!id.equals(entry.getKey())) {
				ret.add(entry.getValue());
			}
		}
		return ret;
	}

	@Override
	public void run() {
		Pubsub pubsub = Pubsub.getInstance();
		long tick = 0;
		while (true) {
			long start = System.currentTimeMillis();
			
			for (Car car : cars.values()) {
				car.lastTick = tick;
			}
			
			Tick t = new Tick(tick, new HashMap<>(cars));
			pubsub.getStream().publish(t);
			
			try {
				Thread.sleep(Math.max(0, 16-(System.currentTimeMillis()-start)));
			} catch (InterruptedException e) {
				// ignore
			}
			tick++;
		}
	}
}
