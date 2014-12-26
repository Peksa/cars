package models;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

public class Tick {
	public long id;
	
	private Map<String, Car> cars;
	
	public Tick(long id, Map<String, Car> cars) {
		this.id = id;
		this.cars = cars;
	}
	
	public Car getCar(String id) {
		return cars.get(id);
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
}
