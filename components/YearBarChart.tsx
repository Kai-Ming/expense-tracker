// YearBarChart.tsx - Full text without cutting
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export interface YearBarChartProps {
  data: number[];
  labels: string[];
  labelFormatter: (value: string) => string;
  color?: string;
  strokeColor?: string;
  segments?: number;
  formatTooltip?: (value: number) => string;
  showValuesOnTop?: boolean;
  valueFormatter?: (value: number) => string;
}

const YearBarChart: React.FC<YearBarChartProps> = ({
  data,
  labels,
  labelFormatter,
  color = "rgba(134, 65, 244, 1)",
  strokeColor = "#6200ee",
  segments = 5,
  formatTooltip,
  showValuesOnTop = true,
  valueFormatter,
}) => {
  const [selectedBar, setSelectedBar] = useState<{
    index: number;
    value: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const chartWidth = screenWidth - 40;

  // Calculate nice y-axis intervals
  const { maxValue, step } = useMemo(() => {
    const maxDataValue = Math.max(...data);
    let step = 10;

    if (maxDataValue > 100000000) step = 10000000;
    else if (maxDataValue > 50000000) step = 5000000;
    else if (maxDataValue > 10000000) step = 1000000;
    else if (maxDataValue > 5000000) step = 500000;
    else if (maxDataValue > 1000000) step = 100000;
    else if (maxDataValue > 500000) step = 50000;
    else if (maxDataValue > 100000) step = 10000;
    else if (maxDataValue > 50000) step = 5000;
    else if (maxDataValue > 10000) step = 1000;
    else if (maxDataValue > 5000) step = 500;
    else if (maxDataValue > 1000) step = 100;
    else if (maxDataValue > 500) step = 50;
    else if (maxDataValue > 100) step = 10;
    else if (maxDataValue > 50) step = 5;
    else if (maxDataValue > 10) step = 1;

    const roundedMax = Math.ceil(maxDataValue / step) * step;
    return { maxValue: roundedMax, step };
  }, [data]);

  // Scale data to fit within the nice max value
  const scaledData = useMemo(() => {
    const currentMax = Math.max(...data);
    if (currentMax === 0) return data;
    const scaleFactor = maxValue / currentMax;
    return data.map((value) => value * scaleFactor);
  }, [data, maxValue]);

  // Calculate bar positions for custom value labels
  const barPositions = useMemo(() => {
    const padding = 32;
    const chartAreaWidth = chartWidth - padding * 2;
    const barWidth = chartAreaWidth / data.length;
    const chartHeight = 220;
    const topPadding = 30;

    // Use the same scaling as the BarChart
    const currentMax = Math.max(...data);
    const scaleFactor = currentMax > 0 ? maxValue / currentMax : 1;

    return data.map((value, index) => {
      const x = padding + index * barWidth + barWidth / 2;
      // Apply the same scaling that BarChart uses internally
      const scaledValue = value * scaleFactor;
      const barHeight = (scaledValue / maxValue) * (chartHeight - topPadding);
      const y = chartHeight - barHeight - topPadding / 2;

      return { x, y, value };
    });
  }, [data, maxValue, chartWidth]);

  // PanResponder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX } = evt.nativeEvent;
      const padding = 32;
      const chartAreaWidth = chartWidth - padding * 2;
      const barWidth = chartAreaWidth / data.length;
      const relativeX = locationX - padding;
      const index = Math.floor(relativeX / barWidth);

      if (index >= 0 && index < data.length) {
        setSelectedBar({
          index: index,
          value: data[index],
        });
        setTooltipPosition({
          x: Math.min(locationX - 40, screenWidth - 120),
          y: Math.max(evt.nativeEvent.locationY - 70, 20),
        });
      }
    },
  });

  // Format value for display
  const formatValue = (value: number) => {
    if (valueFormatter) {
      return valueFormatter(value);
    }
    if (formatTooltip) {
      return formatTooltip(value);
    }
    return value.toString();
  };

  return (
    <View style={{ position: "relative" }}>
      <BarChart
        data={{
          labels: labels,
          datasets: [
            {
              data: scaledData,
            },
          ],
        }}
        width={chartWidth}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => color.replace("1)", `${opacity})`),
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          fillShadowGradientOpacity: 0.4,
          fillShadowGradientFromOpacity: 0.4,
          fillShadowGradientToOpacity: 0.4,
          style: { borderRadius: 16 },
          propsForLabels: {
            fontSize: 14,
            fontWeight: "600",
          },
          propsForBackgroundLines: {
            strokeDasharray: "5, 5",
          },
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        formatYLabel={() => ""}
        fromZero={true}
        withVerticalLabels={true}
        withHorizontalLabels={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        segments={segments}
        showValuesOnTopOfBars={false}
      />

      {/* Custom value labels on top of bars - Full text without cutting */}
      {showValuesOnTop && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {barPositions.map((bar, index) => {
            const formattedValue = formatValue(bar.value);
            // Calculate text width based on content
            const textWidth = Math.max(60, formattedValue.length * 10);

            return (
              <Text
                key={index}
                style={{
                  position: "absolute",
                  left: bar.x - textWidth / 2,
                  top: bar.y - 25,
                  width: textWidth,
                  fontSize: 14,
                  fontFamily: "serif",
                  color: strokeColor,
                  textAlign: "center",
                  backgroundColor: "rgba(255,255,255,0.9)", // Slight background for readability
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
                numberOfLines={1}
                minimumFontScale={0.8}
                adjustsFontSizeToFit
                allowFontScaling
              >
                {formattedValue}
              </Text>
            );
          })}
        </View>
      )}

      {/* Touch overlay */}
      {/* <View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          zIndex: 1,
        }}
      /> */}

      {selectedBar && (
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              zIndex: 2,
            },
          ]}
        >
          <Text style={styles.tooltipLabel}>{labels[selectedBar.index]}</Text>
          <Text style={[styles.tooltipValue, { color: strokeColor }]}>
            {formatTooltip
              ? formatTooltip(selectedBar.value)
              : selectedBar.value.toString()}
          </Text>
          <TouchableOpacity
            style={styles.tooltipClose}
            onPress={() => setSelectedBar(null)}
          >
            <Text style={styles.tooltipCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    maxWidth: 250, // Allow tooltip to expand
    alignItems: "center",
  },
  tooltipLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  tooltipValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tooltipClose: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#eee",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipCloseText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "bold",
  },
});

export default YearBarChart;
