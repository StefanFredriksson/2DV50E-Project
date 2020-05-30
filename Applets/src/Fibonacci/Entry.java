package Fibonacci;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.*;
import java.util.Date;

import javax.swing.*;

import netscape.javascript.*;

public class Entry extends JApplet {
	private static final long serialVersionUID = 1L;
	JLabel label;
	public void init() {
        try {
            SwingUtilities.invokeAndWait(new Runnable() {
                public void run() {
                    runFibonacci();
                }
            });
        } catch (Exception e) { 
            System.err.println("createGUI didn't complete successfully");
        }
    }
    
    public void runFibonacci() {
    	final int SIZE = 43;
    	JSObject window = null;
    	try {
       	 window = JSObject.getWindow(this);
       	} catch (Exception e) {
       		
       	}
    	long start = System.currentTimeMillis();
    	
    	for (int i = 1; i <= SIZE; i++) {
    		nthFibonacci(i);
    	}

    	long execTime = System.currentTimeMillis() - start;
    	
    	Date d = new Date();
    	long time = d.getTime();

    	label = new JLabel("Done.");
    	add(label);
    	
    	if (window != null) {
    		window.call("appDone", new Object[] {time, execTime});
    	}
    }
    
    public int nthFibonacci(int n) {
		if (n <= 0) {
			throw new IllegalArgumentException("The value passed to the method must be positive.");
		}
		
		if (n == 1) {
			return 0;
		} else if (n == 2) {
			return 1;
		}
		
		int sum = nthFibonacci(n - 1) + nthFibonacci(n - 2);
		
		return sum;
	}
}
