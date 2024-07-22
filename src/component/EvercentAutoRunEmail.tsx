import {
  Body,
  Column,
  Container,
  Html,
  Img,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import React from "react";
import { roundNumber } from "../utils/util";
import { AutoRunCategoryGroup } from "../autoRun";
import { format, parseISO } from "date-fns";

type Props = {
  runTime: string;
  results: AutoRunCategoryGroup[];
};

function EvercentAutoRunEmail({ runTime, results }: Props) {
  let totalPosted = 0;
  for (let i = 0; i < results.length; i++) {
    for (let j = 0; j < results[i].categories.length; j++) {
      for (let k = 0; k < results[i].categories[j].postingMonths.length; k++) {
        totalPosted +=
          results[i].categories[j].postingMonths[k].amountPosted || 0;
      }
    }
  }

  return (
    <Tailwind config={{}}>
      <Html lang="en" dir="ltr">
        <Body>
          <Container>
            <Section style={{ borderBottom: "5px solid white" }}>
              <Row>
                <Column style={{ width: "20%" }}>
                  <Img src="cid:logo" alt="Logo" width="100" height="120" />
                </Column>
                <Column
                  style={{
                    width: "75%",
                    textAlign: "center",
                  }}
                >
                  <Text>
                    <span
                      style={{
                        fontFamily: "Roboto",
                        fontSize: "36px",
                        fontWeight: "bold",
                      }}
                    >
                      EverCent
                    </span>
                    <br />
                    <span
                      style={{
                        fontFamily: "Roboto",
                        fontSize: "24px",
                        fontStyle: "italic",
                      }}
                    >
                      Automation Results
                    </span>
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section style={{ borderBottom: "5px solid white" }}>
              <Row>
                <Column
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    backgroundColor: "#eee",
                    border: "1px solid gray",
                    borderRadius: "10px",
                  }}
                >
                  <Text>
                    <span
                      style={{
                        fontFamily: "Roboto",
                        fontSize: "24px",
                        fontWeight: "bold",
                        textDecoration: "underline",
                      }}
                    >
                      Total Amount Posted
                    </span>
                    <br />
                    <span
                      style={{
                        fontFamily: "Roboto",
                        fontSize: "24px",
                        color: "green",
                      }}
                    >
                      {"$" + roundNumber(totalPosted, 2)}
                    </span>
                  </Text>
                </Column>
                {/* <Column style={{ width: "2%" }}></Column>
                  <Column
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      backgroundColor: "#eee",
                      border: "1px solid gray",
                      borderRadius: "10px",
                    }}
                  >
                    <Text>
                      <span
                        style={{
                          fontFamily: "Roboto",
                          fontSize: "24px",
                          fontWeight: "bold",
                          textDecoration: "underline",
                        }}
                      >
                        Run Time
                      </span>
                      <br />
                      <span
                        style={{
                          fontFamily: "Roboto",
                          fontSize: "20px",
                          fontStyle: "italic",
                        }}
                      >
                        {results.runTime}
                      </span>
                    </Text>
                  </Column> */}
              </Row>
            </Section>

            <Section style={{ margin: "20px" }}>
              <table
                style={{
                  width: "100%",
                  backgroundColor: "#eee",
                  border: "1px solid gray",
                  borderRadius: "10px",
                }}
              >
                <thead style={{ borderBottom: "2px solid black" }}>
                  <tr style={{ borderBottom: "2px solid black" }}>
                    <th style={{ width: "40%", textAlign: "left" }}>
                      Category/Month
                    </th>
                    <th style={{ width: "30%", textAlign: "right" }}>
                      Amount Posted
                    </th>
                    <th style={{ width: "30%", textAlign: "right" }}>
                      New Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((g) => {
                    return (
                      <div key={g.groupName}>
                        <tr style={{ fontSize: "125%", fontWeight: "bold" }}>
                          <td style={{ paddingTop: "5px" }}>
                            <u>{g.groupName}</u>
                          </td>
                        </tr>
                        {g.categories.map((c) => {
                          return (
                            <div key={c.categoryName}>
                              <tr style={{ fontSize: "110%" }}>
                                <td
                                  style={{
                                    paddingLeft: "15px",
                                  }}
                                >
                                  {c.categoryName}
                                </td>
                              </tr>
                              {c.postingMonths.map((m) => {
                                return (
                                  <tr
                                    key={m.postingMonth}
                                    style={{
                                      borderBottom: "8px solid transparent",
                                    }}
                                  >
                                    <td
                                      style={{
                                        width: "40%",
                                        textAlign: "left",
                                        paddingLeft: "30px",
                                        color: "#aaa",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {format(
                                        parseISO(
                                          new Date(m.postingMonth)
                                            .toISOString()
                                            .substring(0, 10)
                                        ),
                                        "MMM yyyy"
                                      ).toUpperCase()}
                                    </td>
                                    <td
                                      style={{
                                        width: "30%",
                                        textAlign: "right",
                                      }}
                                    >
                                      {"$" +
                                        roundNumber(
                                          m.amountPosted || 0,
                                          2
                                        ).toString()}
                                    </td>
                                    <td
                                      style={{
                                        width: "30%",
                                        textAlign: "right",
                                      }}
                                    >
                                      <span
                                        style={{
                                          backgroundColor: "green",
                                          color: "white",
                                          borderRadius: "10px",
                                          fontWeight: "bold",
                                          padding: "3px",
                                          margin: "2px",
                                        }}
                                      >
                                        {"$" +
                                          roundNumber(
                                            m.newAmountBudgeted || 0,
                                            2
                                          ).toString()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default EvercentAutoRunEmail;
