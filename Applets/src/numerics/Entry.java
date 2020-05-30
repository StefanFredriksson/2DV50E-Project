package numerics;

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

    	doComputations();

    	long execTime = System.currentTimeMillis() - start;
    	
    	Date d = new Date();
    	long time = d.getTime();

    	label = new JLabel("Done.");
    	add(label);
    	
    	if (window != null) {
    		window.call("appDone", new Object[] {time, execTime});
    	}
    }
    
    private void doComputations() {
    	final int SIZE = 100000000;
    	Random rand = new Random();
    	
    	for (int i = 0; i < SIZE; i++) {
    		int val1 = rand.nextInt(10) + 1;
    		int val2 = rand.nextInt(10) + 1;
    		
    		if (val1 < val2) {
    			val1 = 1;
    		}
    		
    		if (val2 < val1) {
    			val2 = 1;
    		}
    		
    		if (val1 == val2) {
    			val1 = 1;
    			val2 = 1;
    		}
    	}
    }
}
