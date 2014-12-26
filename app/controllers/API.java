package controllers;

import static play.libs.F.Matcher.ClassOf;
import static play.mvc.Http.WebSocketEvent.SocketClosed;
import static play.mvc.Http.WebSocketEvent.TextFrame;
import models.Movement;
import play.libs.F.Either;
import play.libs.F.EventStream;
import play.libs.F.Promise;
import play.mvc.Http.WebSocketClose;
import play.mvc.Http.WebSocketEvent;
import play.mvc.WebSocketController;
import pubsub.Pubsub;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class API extends WebSocketController {

    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public static void listen() {

        Pubsub pubsub = Pubsub.getInstance();
        EventStream<Movement> stream = pubsub.getStream();
        
        double client = Math.random();

        while (inbound.isOpen()) {

            System.err.println("Got connect");

            Either<WebSocketEvent, Movement> e = await(Promise.waitEither(inbound.nextEvent(), stream.nextEvent()));

            
            // Got event from my client, send this to other clients
            for (String movement : TextFrame.match(e._1)) {
                System.err.println("Got movement");
                Movement m = gson.fromJson(movement, Movement.class);
                m.sender = client;
                stream.publish(m);
            }

            // Got event from other client, send this to my client
            for (Movement m : ClassOf(Movement.class).match(e._2)) {
            	// Only send if this wasn't sent by us.
            	if (m.sender != null && m.sender != client) {
            		System.err.println("Sending movement");
            		outbound.send(gson.toJson(m));
            	}
            }

            for (WebSocketClose closed : SocketClosed.match(e._1)) {
                System.err.println("Got disconnect");
                disconnect();
            }
        }
    }
}