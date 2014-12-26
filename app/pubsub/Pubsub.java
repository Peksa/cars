package pubsub;

import models.Tick;
import play.libs.F.EventStream;

public class Pubsub {
	private static Pubsub instance = new Pubsub();
	private final EventStream<Tick> stream = new EventStream<>();
	
	
	public static Pubsub getInstance() {
		return instance;
	}
	
	public EventStream<Tick> getStream() {
		return this.stream; 
	}
	private Pubsub() {
		// private
	}
}
