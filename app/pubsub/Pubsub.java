package pubsub;

import models.Movement;
import play.libs.F.EventStream;

public class Pubsub {
	private static Pubsub instance = new Pubsub();
	private final EventStream<Movement> stream = new EventStream<Movement>();
	
	
	public static Pubsub getInstance() {
		return instance;
	}
	
	public EventStream<Movement> getStream() {
		return this.stream; 
	}
	private Pubsub() {
		// private
	}
}
