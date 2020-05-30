package array;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.*;
import java.util.Date;
import java.util.Random;
import netscape.javascript.*;

import javax.swing.*;

public class Entry extends JApplet {
	private static final long serialVersionUID = 2L;
	JLabel label;
	public void init() {
        try {
            SwingUtilities.invokeAndWait(new Runnable() {
                public void run() {
                    startTest();
                }
            });
        } catch (Exception e) { 
            System.err.println("createGUI didn't complete successfully");
        }
    }
    
    public void startTest() {
    	JSObject window = null;
    	try {
    	 window = JSObject.getWindow(this);
    	} catch (Exception e) {
    		
    	}
    	long start = System.currentTimeMillis();

    	runArray();

    	long execTime = System.currentTimeMillis() - start;
    	
    	Date d = new Date();
    	long time = d.getTime();

    	label = new JLabel("Done.");
    	add(label);
    	
    	if (window != null) {
    		window.call("appDone", new Object[] {time, execTime});
    	}
    }
    
    private void runArray() {
    	final int SIZE = 30000000;
    	Random rand = new Random();
    	int[] arr = new int[SIZE];
    	
    	for (int i = 0; i < SIZE; i++) {
    		int val = rand.nextInt(10) + 1;
    		arr[i] = val;
    	}
    	
    	for (int i = 0; i < SIZE; i++) {
    		int val1 = rand.nextInt(SIZE);
    		int val2 = rand.nextInt(SIZE);
    		int temp = arr[val1];
    		arr[val1] = arr[val2];
    		arr[val2] = temp;
    	}
    }
}
