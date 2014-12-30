package controllers;

import static play.libs.F.Matcher.ClassOf;
import static play.mvc.Http.WebSocketEvent.SocketClosed;
import static play.mvc.Http.WebSocketEvent.TextFrame;

import org.apache.commons.lang.RandomStringUtils;

import game.Game;
import models.Car;
import models.Message;
import models.Tick;
import play.libs.F.Either;
import play.libs.F.EventStream;
import play.libs.F.Promise;
import play.mvc.Http.WebSocketClose;
import play.mvc.Http.WebSocketEvent;
import play.mvc.Util;
import play.mvc.WebSocketController;
import pubsub.Pubsub;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class API extends WebSocketController {

    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    
    @Util
    private static Message generateCarMessage(Car car) {
    	Message ret = new Message();
    	ret.type = "join";
    	ret.player = car;
    	return ret;
    }

    public static void listen() {
        Pubsub pubsub = Pubsub.getInstance();
        Game game = Game.getInstance();
        EventStream<Tick> stream = pubsub.getStream();
        
        String id = RandomStringUtils.random(6, "0123456789abcdef");
        long hue = Math.round(Math.random()*255);
        
        Car car = new Car();
        car.id = id;
        car.hue = hue;
        car.top = 100d;
        car.left = 430d;
        car.rotation = 0d;
        car.speed = 0d;
        
        game.updateCar(id, car);
        
        if (inbound.isOpen()) {
        	 System.err.println("Got connect, sending car!");
             outbound.send(gson.toJson(generateCarMessage(car)));
        }
        
        try {
        	while (inbound.isOpen()) {

	            Either<WebSocketEvent, Tick> e = await(Promise.waitEither(inbound.nextEvent(), stream.nextEvent()));
	
	            // Got event from my client, update global game state
	            for (String movement : TextFrame.match(e._1)) {
	                Car c = gson.fromJson(movement, Car.class);
	                c.id = id;
	                c.hue = hue;
	                game.updateCar(id, c);
	            }
	
	            // Got tick! Send current state to client
	            for (Tick tick : ClassOf(Tick.class).match(e._2)) {
	            	Message msg = generateTickmessage(id, tick, game.getNumberOfCars());
	            	if (tick.id % 120 == 0) {
	            		System.err.println("Sending tick: " + tick.id + ", " + game.getNumberOfCars() + " car(s) connected.");
	            	}
	        		outbound.send(gson.toJson(msg));
	            }
	
	            for (WebSocketClose closed : SocketClosed.match(e._1)) {
	                System.err.println("Got disconnect.");
	                game.removeCar(id);
	                disconnect();
	            }
        	}
        } catch (IllegalStateException e) {
        	// ignore, this simply means someone has been disconnected.
        } finally {
        	System.err.println("Exception, disconnecting..");
        	game.removeCar(id);
        }
    }

	private static Message generateTickmessage(String id, Tick tick, int clients) {
		Message msg = new Message();
		msg.type = "tick";
    	msg.player = tick.getCar(id);
    	msg.cars = tick.getCarsExcept(id);
    	msg.tick = tick.id;
    	msg.numberOfClients = clients;
		return msg;
	}
}