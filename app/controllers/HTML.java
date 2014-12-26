package controllers;

import play.mvc.Controller;

public class HTML extends Controller {

    public static void index() {
        redirect("/public/index.html");
    }

}