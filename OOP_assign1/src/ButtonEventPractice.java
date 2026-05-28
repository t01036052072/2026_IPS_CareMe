import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;

public class ButtonEventPractice extends JFrame implements ActionListener {
    private static final long serialVersionUID = 1L;

    private static final String WINDOW_TITLE = "Button Event Practice";
    private static final String BUTTON_TEXT = "Click";
    private static final String CLICK_COUNT_PREFIX = "클릭 횟수: ";
    private static final int BACKGROUND_CHANGE_COUNT = 5;

    private final JPanel contentPanel;
    private final JLabel clickCountLabel;
    private final JButton clickButton;

    private int clickCount;

    public ButtonEventPractice() {
        clickCount = 0;

        contentPanel = new JPanel(new BorderLayout(10, 10));
        clickCountLabel = new JLabel(CLICK_COUNT_PREFIX + clickCount, SwingConstants.CENTER);
        clickButton = new JButton(BUTTON_TEXT);

        initializeFrame();
        initializeComponents();
    }

    private void initializeFrame() {
        setTitle(WINDOW_TITLE);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(new Dimension(360, 220));
        setLocationRelativeTo(null);
        setContentPane(contentPanel);
    }

    private void initializeComponents() {
        contentPanel.setBorder(BorderFactory.createEmptyBorder(35, 45, 35, 45));

        clickCountLabel.setFont(new Font("Dialog", Font.BOLD, 22));
        clickButton.setFont(new Font("Dialog", Font.PLAIN, 18));
        clickButton.addActionListener(this);

        contentPanel.add(clickCountLabel, BorderLayout.CENTER);
        contentPanel.add(clickButton, BorderLayout.SOUTH);
    }

    @Override
    public void actionPerformed(ActionEvent event) {
        clickCount++;
        clickCountLabel.setText(CLICK_COUNT_PREFIX + clickCount);

        if (clickCount >= BACKGROUND_CHANGE_COUNT) {
            contentPanel.setBackground(new Color(220, 240, 255));
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(new Runnable() {
            @Override
            public void run() {
                ButtonEventPractice practiceFrame = new ButtonEventPractice();
                practiceFrame.setVisible(true);
            }
        });
    }
}
